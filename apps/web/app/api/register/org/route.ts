import { NextRequest, NextResponse } from 'next/server'
import { getCookieName } from '@/lib/auth'
import { serverApiBase } from '@/lib/api'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const org_code = String(form.get('org_code') || '')
  const org_name = String(form.get('org_name') || '')
  const email = String(form.get('email') || '')
  const username = String(form.get('username') || '')
  const password = String(form.get('password') || '')
  const api = serverApiBase()
  const r = await fetch(`${api}/orgs/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ org_code, org_name, email, username, password })
  })
  if (!r.ok) {
    const data = await r.json().catch(()=>({}))
    return NextResponse.json(data, { status: r.status })
  }
  const { token, refresh_token } = await r.json()
  const res = NextResponse.redirect(new URL('/register/client', req.url))
  res.cookies.set(getCookieName(), token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60*60*8 })
  if (refresh_token) res.cookies.set('refresh_token', refresh_token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60*60*24*30 })
  return res
}
