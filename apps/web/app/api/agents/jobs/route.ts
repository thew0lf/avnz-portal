import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const base = process.env.AI_BASE_INTERNAL || 'http://ai:8000'
  const url = new URL(req.url)
  const limit = url.searchParams.get('limit') || '50'
  const r = await fetch(`${base}/agents/jobs?limit=${encodeURIComponent(limit)}`, { cache: 'no-store' })
  const body = await r.text()
  return new Response(body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'application/json' } })
}

export async function POST(req: NextRequest) {
  const base = process.env.AI_BASE_INTERNAL || 'http://ai:8000'
  const rawText = await req.text().catch(()=> '')
  let raw: any = {}
  try { raw = rawText ? JSON.parse(rawText) : {} } catch { raw = {} }
  const c = cookies()
  const project_code = c.get('projectCode')?.value || ''
  const client_id = c.get('clientFilter')?.value || ''
  const org_id = c.get('orgFilter')?.value || ''
  const metaFromCookies: any = { project_code: project_code || undefined, client_id: client_id || undefined, org_id: org_id || undefined }
  const mergedMeta = { ...(raw?.meta||{}), ...metaFromCookies }
  const body = JSON.stringify({ task: String(raw?.task||''), meta: mergedMeta })
  const r = await fetch(`${base}/agents/jobs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
  const text = await r.text()
  return new Response(text, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'application/json' } })
}
