import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCookieName, verifyToken } from '@/lib/auth'
import { serverApiBase } from '@/lib/api'

export async function GET(req: NextRequest) {
  const cookie = cookies().get(getCookieName())
  let token = cookie?.value || ''
  if (!token) {
    const authz = req.headers.get('authorization') || ''
    if (authz.toLowerCase().startsWith('bearer ')) token = authz.slice(7)
  }
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const aiBase = process.env.NEXT_PUBLIC_AI_BASE || 'http://localhost:8000'
  const search = req.nextUrl.search || ''
  let r = await fetch(`${aiBase}/rps/orders${search}`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (r.status === 401) {
    const refresh = cookies().get('refresh_token')?.value
    if (refresh) {
      const api = serverApiBase()
      const rr = await fetch(`${api}/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refresh_token: refresh }) })
      if (rr.ok) {
        const { token: newToken } = await rr.json()
        const res = new NextResponse(null, { status: 200 })
        res.cookies.set(getCookieName(), newToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 8 })
        r = await fetch(`${aiBase}/rps/orders${search}`, { headers: { authorization: `Bearer ${newToken}` }, cache: 'no-store' })
        const body = await r.text()
        return new Response(body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'application/json' } })
      }
    }
  }
  const body = await r.text()
  return new Response(body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'application/json' } })
}
