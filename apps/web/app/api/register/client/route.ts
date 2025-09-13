import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCookieName, verifyToken } from '@/lib/auth'
import { serverApiBase } from '@/lib/api'

export async function POST(req: NextRequest) {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) return NextResponse.redirect(new URL('/register/org', req.url))
  const form = await req.formData()
  const name = String(form.get('name') || '')
  const api = serverApiBase()
  const r = await fetch(`${api}/clients/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ name })
  })
  const data = await r.json().catch(()=>({}))
  if (!r.ok) return NextResponse.json(data, { status: r.status })
  return NextResponse.redirect(new URL('/admin/clients', req.url))
}
