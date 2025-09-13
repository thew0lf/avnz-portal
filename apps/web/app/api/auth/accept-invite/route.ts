import { NextRequest, NextResponse } from 'next/server'
import { serverApiBase } from '@/lib/api'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const token = String(form.get('token') || '')
  const password = String(form.get('password') || '')
  const username = String(form.get('username') || '')
  const api = serverApiBase()
  const r = await fetch(`${api}/auth/accept-invite`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, password, username: username || undefined })
  })
  const data = await r.json().catch(()=>({}))
  if (!r.ok) return NextResponse.json(data, { status: r.status })
  const client_code = data?.client_code
  const url = new URL('/login', req.url)
  if (client_code) url.searchParams.set('client_code', client_code)
  return NextResponse.redirect(url)
}

