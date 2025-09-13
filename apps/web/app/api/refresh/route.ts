import { NextRequest, NextResponse } from 'next/server'
import { getCookieName } from '@/lib/auth'
import { serverApiBase } from '@/lib/api'

export async function POST(req: NextRequest) {
  const api = serverApiBase()
  const refresh = req.cookies.get('refresh_token')?.value
  if (!refresh) return NextResponse.json({ ok: false, error: 'no refresh token' }, { status: 401 })
  const r = await fetch(`${api}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  })
  if (!r.ok) return NextResponse.json({ ok: false }, { status: r.status })
  const { token } = await r.json()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(getCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  })
  return res
}
