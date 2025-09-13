import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCookieName, verifyToken } from '@/lib/auth'
import { serverApiBase } from '@/lib/api'

export async function POST(req: NextRequest) {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const perms = (session as any).perms || []
  if (!perms.includes('ingest') && !perms.includes('admin')) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
  }

  const aiBase = process.env.NEXT_PUBLIC_AI_BASE || 'http://localhost:8000'
  const form = await req.formData()
  // AI will derive org/user from token; don't trust client-set values
  let r = await fetch(`${aiBase}/ingest`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form as any })
  if (r.status === 401) {
    const refresh = cookies().get('refresh_token')?.value
    if (refresh) {
      const api = serverApiBase()
      const rr = await fetch(`${api}/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refresh_token: refresh }) })
      if (rr.ok) {
        const { token: newToken } = await rr.json()
        const res = new NextResponse(null, { status: 200 })
        res.cookies.set(getCookieName(), newToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 8 })
        r = await fetch(`${aiBase}/ingest`, { method: 'POST', headers: { authorization: `Bearer ${newToken}` }, body: form as any })
        const data2 = await r.json().catch(() => ({}))
        return new NextResponse(JSON.stringify(data2), { status: r.status, headers: { 'content-type': 'application/json' } })
      }
    }
  }
  const data = await r.json().catch(() => ({}))
  return NextResponse.json(data, { status: r.status })
}
