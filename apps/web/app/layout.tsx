import './globals.css'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getCookieName, verifyToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import NextTopLoader from 'nextjs-toploader'
import AppProviders from '@/components/AppProviders'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookie = cookies().get(getCookieName())
  const session = cookie?.value
    ? verifyToken(cookie.value, process.env.AUTH_SECRET || 'dev-secret-change-me')
    : null
  return (
    <html lang="en">
      <body>
        <NextTopLoader color="#0ea5e9" initialPosition={0.2} crawlSpeed={150} height={3} crawl={true} showSpinner={false} easing="ease" speed={200} shadow="0 0 10px #0ea5e9, 0 0 5px #0ea5e9" />
        <header className="border-b">
          <div className="container flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-semibold">avnzr-portal</Link>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {session ? (
                <>
                  <span className="text-muted-foreground">
                    {session.email} · {session.orgId} · {session.roles.join(',')}
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <Link href="/login">Sign in</Link>
              )}
            </div>
          </div>
        </header>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
