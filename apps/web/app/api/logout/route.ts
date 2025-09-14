import { NextRequest, NextResponse } from 'next/server'
import { getCookieName } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', req.url))
  const cookieName = getCookieName()
  // Clear session + refresh cookies
  res.cookies.set(cookieName, '', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0 })
  res.cookies.set('refresh_token', '', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0 })
  return res
}

