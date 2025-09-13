import { NextRequest, NextResponse } from 'next/server'
import { serverApiBase } from '@/lib/api'

export async function POST(req: NextRequest) {
  const api = serverApiBase()
  const { token, password } = await req.json()
  const r = await fetch(`${api}/auth/reset`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, password }),
  })
  const data = await r.json().catch(() => ({}))
  return NextResponse.json(data, { status: r.status })
}
