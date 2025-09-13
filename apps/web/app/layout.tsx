import './globals.css'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getCookieName, verifyToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'

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
        <header className="border-b">
          <div className="container flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-semibold">avnzr-portal</Link>
              <nav className="text-sm text-muted-foreground flex gap-3">
                <Link href="/admin">Admin</Link>
                <Link href="/admin/pricing">Pricing</Link>
                <Link href="/admin/documents">Documents</Link>
                <Link href="/admin/search">Search</Link>
                <Link href="/admin/clients">Clients</Link>
                <Link href="/admin/projects">Projects</Link>
                <Link href="/admin/members">Members</Link>
                <Link href="/admin/project-members">Project Members</Link>
                <Link href="/admin/roles">Roles</Link>
              </nav>
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
        {children}
      </body>
    </html>
  )
}
