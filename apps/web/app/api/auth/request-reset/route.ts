import { NextRequest, NextResponse } from 'next/server'
import { serverApiBase } from '@/lib/api'

export async function POST(req: NextRequest) {
  const api = serverApiBase()
  const { client_code, email, identifier } = await req.json()
  const r = await fetch(`${api}/auth/request-reset`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_code, email, identifier }),
  })
  const data = await r.json().catch(() => ({}))
  return NextResponse.json(data, { status: r.status })
}
