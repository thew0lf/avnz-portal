import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCookieName, verifyToken } from '@/lib/auth'
import { serverApiBase } from '@/lib/api'

// Allow-list of API path prefixes this proxy can forward to.
// Include mutating endpoints under admin plus user-scoped "me" endpoints used by settings.
const ALLOWED_PREFIX = /^(\/me|\/admin|\/projects|\/clients|\/roles|\/memberships|\/nodes|\/project-members|\/pricing|\/jira)/
const ALLOWED_METHODS = new Set(['POST', 'PATCH', 'DELETE'])

export async function POST(req: NextRequest) {
  const { path, method, body } = await req.json().catch(() => ({})) as { path?: string; method?: string; body?: any }
  if (!path || typeof path !== 'string' || !ALLOWED_PREFIX.test(path)) {
    return NextResponse.json({ ok: false, error: 'forbidden_path' }, { status: 400 })
  }
  const m = (method || 'POST').toUpperCase()
  if (!ALLOWED_METHODS.has(m)) {
    return NextResponse.json({ ok: false, error: 'forbidden_method' }, { status: 400 })
  }
  const token = cookies().get(getCookieName())?.value
  if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  // Ensure nodeId query for admin endpoints if absent
  let forwardPath = path
  if (forwardPath.startsWith('/admin') && !/([?&])nodeId=/.test(forwardPath)) {
    try {
      const secret = process.env.AUTH_SECRET || 'dev-secret-change-me'
      const session = verifyToken(token, secret)
      const nodeId = (session as any)?.orgUUID || (session as any)?.orgId
      if (nodeId) {
        forwardPath += (forwardPath.includes('?') ? '&' : '?') + `nodeId=${encodeURIComponent(nodeId)}`
      }
    } catch {
      // ignore; will rely on backend auth failure if needed
    }
  }
  const api = serverApiBase()
  const headers: Record<string,string> = { 'content-type': 'application/json', authorization: `Bearer ${token}` }
  // For service-token endpoints, inject X-Service-Token from env
  if (forwardPath.startsWith('/jira/') || forwardPath.startsWith('/admin/services/configs/persist-jira-assignees')) {
    const svc = process.env.SERVICE_TOKEN || ''
    if (svc) headers['x-service-token'] = svc
  }
  const r = await fetch(`${api}${forwardPath}`, {
    method: m,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  let data: any = null
  try { data = await r.json() } catch { data = null }
  return NextResponse.json(data ?? { ok: r.ok }, { status: r.status })
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const path = url.searchParams.get('path') || ''
  if (!path || !ALLOWED_PREFIX.test(path)) {
    return NextResponse.json({ ok: false, error: 'forbidden_path' }, { status: 400 })
  }
  const token = cookies().get(getCookieName())?.value
  if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  // Ensure nodeId query for admin endpoints if absent
  let forwardPath = path
  if (forwardPath.startsWith('/admin') && !/([?&])nodeId=/.test(forwardPath)) {
    try {
      const secret = process.env.AUTH_SECRET || 'dev-secret-change-me'
      const session = verifyToken(token, secret)
      const nodeId = (session as any)?.orgUUID || (session as any)?.orgId
      if (nodeId) {
        forwardPath += (forwardPath.includes('?') ? '&' : '?') + `nodeId=${encodeURIComponent(nodeId)}`
      }
    } catch {
      // ignore
    }
  }
  const api = serverApiBase()
  const headers: Record<string,string> = { 'content-type': 'application/json', authorization: `Bearer ${token}` }
  if (forwardPath.startsWith('/jira/') || forwardPath.startsWith('/admin/services/configs/persist-jira-assignees')) {
    const svc = process.env.SERVICE_TOKEN || ''
    if (svc) headers['x-service-token'] = svc
  }
  const r = await fetch(`${api}${forwardPath}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  })
  let data: any = null
  try { data = await r.json() } catch { data = null }
  return NextResponse.json(data ?? { ok: r.ok }, { status: r.status })
}
