import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const base = process.env.AI_BASE_INTERNAL || 'http://ai:8000'
  const r = await fetch(`${base}/agents/jobs/${encodeURIComponent(params.id)}`, { cache: 'no-store' })
  const body = await r.text()
  return new Response(body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'application/json' } })
}
