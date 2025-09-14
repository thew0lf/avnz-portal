import './globals.css'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiBase } from '@/lib/api'
import { Button } from '@/components/ui/button'
import NextTopLoader from 'nextjs-toploader'
import AppProviders from '@/components/AppProviders'
import PwaRegister from '@/components/PwaRegister'

async function LogoutButton() {
  async function action() {
    'use server'
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/logout`, { method: 'POST' })
  }
  return (
    <form action="/api/logout" method="post">
      <Button type="submit" variant="outline">Sign out</Button>
    </form>
  )
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookie = cookies().get(getCookieName())
  const session = cookie?.value
    ? verifyToken(cookie.value, process.env.AUTH_SECRET || 'dev-secret-change-me')
    : null
  // Load portal name from API app settings
  let portalName = 'Avnz'
  try {
    const r = await fetch(`${apiBase()}/api/app-settings`, { cache: 'no-store' })
    const cfg = await r.json().catch(()=>({}))
    if (cfg?.portal_name) portalName = cfg.portal_name
  } catch {}
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#111827" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body suppressHydrationWarning={true}>
        <NextTopLoader color="#0ea5e9" initialPosition={0.2} crawlSpeed={150} height={3} crawl={true} showSpinner={false} easing="ease" speed={200} shadow="0 0 10px #0ea5e9, 0 0 5px #0ea5e9" />
        <header className="border-b sa-top">
          <div className="container flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-semibold">{portalName}</Link>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {session ? (<LogoutButton />) : (<Link href="/login">Sign in</Link>)}
            </div>
          </div>
        </header>
        <AppProviders>{children}</AppProviders>
        {/* PWA registration */}
        {/* @ts-expect-error Client Component below */}
        <PwaRegister />
        <footer className="sa-bottom" />
      </body>
    </html>
  )
}
