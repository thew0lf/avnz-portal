import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/admin']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()
  // CSRF token cookie (set if missing)
  if (!req.cookies.get('csrf')?.value) {
    const token = cryptoRandomString(32)
    res.cookies.set('csrf', token, { httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' })
  }
  // Security headers
  res.headers.set('X-Frame-Options','DENY')
  res.headers.set('X-Content-Type-Options','nosniff')
  res.headers.set('Referrer-Policy','no-referrer')
  res.headers.set('Permissions-Policy','geolocation=(), microphone=(), camera=()')
  // Basic CSP for web app; relax in dev for Next dev runtime (react-refresh)
  const isProd = process.env.NODE_ENV === 'production'
  const scriptSrc = ["script-src 'self' 'unsafe-inline' https://unpkg.com"].concat(isProd ? [] : ["'unsafe-eval'"]).join(' ')
  const connectSrc = [
    "connect-src 'self' https://api https://ai http://localhost:3001 http://localhost:8000",
  ].concat(isProd ? [] : [
    'ws:', // allow websocket in dev for HMR
  ]).join(' ')
  const csp = [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    scriptSrc,
    connectSrc,
    "frame-ancestors 'none'"
  ].join('; ')
  res.headers.set('Content-Security-Policy', csp)

  // Allow public paths
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login') || pathname.startsWith('/api/logout')) {
    return res
  }

  // Gate protected prefixes: require any session cookie (verification occurs server-side)
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const hasSession = Boolean(req.cookies.get('session')?.value)
    if (!hasSession) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
  }
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

function cryptoRandomString(len: number){
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i=0;i<len;i++) out += alphabet[Math.floor(Math.random()*alphabet.length)]
  return out
}
