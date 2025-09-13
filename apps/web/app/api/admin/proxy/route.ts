import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCookieName, verifyToken } from '@/lib/auth'
import { serverApiBase } from '@/lib/api'

const ALLOWED_PREFIX = /^(\/admin|\/projects|\/clients|\/roles|\/memberships|\/nodes|\/project-members|\/pricing)/
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
  const r = await fetch(`${api}${forwardPath}`, {
    method: m,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  let data: any = null
  try { data = await r.json() } catch { data = null }
  return NextResponse.json(data ?? { ok: r.ok }, { status: r.status })
}
