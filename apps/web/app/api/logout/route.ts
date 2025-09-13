import { NextResponse } from 'next/server'
import { getCookieName } from '@/lib/auth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(getCookieName(), '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}

