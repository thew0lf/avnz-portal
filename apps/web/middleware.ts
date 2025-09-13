import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/admin']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login') || pathname.startsWith('/api/logout')) {
    return NextResponse.next()
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

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

