import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const res = NextResponse.json({ ok: true })
  const maxAge = 60 * 60 * 24 * 30 // 30 days
  if (typeof body.orgFilter === 'string') {
    res.cookies.set('orgFilter', body.orgFilter, { path: '/', maxAge })
  }
  if (typeof body.clientFilter === 'string') {
    res.cookies.set('clientFilter', body.clientFilter, { path: '/', maxAge })
  }
  if (typeof body.projectCode === 'string') {
    res.cookies.set('projectCode', body.projectCode, { path: '/', maxAge })
  }
  if (typeof body.userFilter === 'string') {
    res.cookies.set('userFilter', body.userFilter, { path: '/', maxAge })
  }
  return res
}

