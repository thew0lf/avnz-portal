import { NextRequest, NextResponse } from 'next/server'
import { getCookieName } from '@/lib/auth'
import { serverApiBase } from '@/lib/api'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const client_code = String(form.get('client_code') || '')
  const email = String(form.get('email') || '')
  const password = String(form.get('password') || '')
  const nextPath = String(form.get('next') || '')

  const api = serverApiBase()
  const r = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_code, identifier: email, password }),
  })
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 })
  }
  const { token, refresh_token, refresh_expires } = await r.json()

  const res = NextResponse.redirect(new URL(nextPath || '/admin', req.url))
  res.cookies.set(getCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8h
  })
  if (refresh_token) {
    res.cookies.set('refresh_token', refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30d
    })
  }
  return res
}
