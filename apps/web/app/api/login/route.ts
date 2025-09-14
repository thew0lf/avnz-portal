import { NextRequest, NextResponse } from 'next/server'
import { getCookieName } from '@/lib/auth'
import { serverApiBase } from '@/lib/api'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const csrf = String(form.get('csrf')||'')
  const csrfCookie = req.cookies.get('csrf')?.value || ''
  if (!csrf || !csrfCookie || csrf !== csrfCookie) {
    return NextResponse.json({ ok:false, error:'invalid csrf' }, { status: 403 })
  }
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
    if (r.status === 429) {
      const retry = r.headers.get('retry-after')
      let inMinutes = ''
      if (retry) {
        const secs = Number(retry)
        if (!Number.isNaN(secs) && secs > 0) {
          const mins = Math.ceil(secs / 60)
          inMinutes = mins > 1 ? `${mins} minutes` : 'about a minute'
        }
      }
      const msg = `For your security, sign-in is temporarily locked due to too many attempts. ${inMinutes?`Please try again in ${inMinutes}, `:''}or reset your password.`
      return NextResponse.json({ ok: false, error: msg }, { status: 429 })
    }
    if (r.status === 423) {
      const msg = 'Your account is temporarily locked. Please try again later or reset your password.'
      return NextResponse.json({ ok: false, error: msg }, { status: 423 })
    }
    // Default friendly message
    return NextResponse.json({ ok: false, error: 'We couldn’t sign you in with those details. Please check your client code, email or username, and password.' }, { status: 401 })
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
