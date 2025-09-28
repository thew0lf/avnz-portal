import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import SettingsNav from './nav'
import AdminSideNav from '@/components/admin/SideNav'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const cookie = cookies().get(getCookieName())
  const session = cookie?.value ? verifyToken(cookie.value, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/settings/profile')
  return (
    <main className="container py-6">
      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <AdminSideNav canAdmin={(session.roles||[]).includes('org')} />
        <div>
          <div className="grid gap-6 md:grid-cols-[220px_1fr]">
            <aside className="h-full rounded-md border bg-white p-3 flex flex-col">
              <SettingsNav />
              <div className="mt-auto pt-3" aria-label="Account switcher">
                <div className="text-xs text-muted-foreground mb-1">Account</div>
                <button type="button" className="w-full rounded-md border px-2 py-1.5 text-sm text-left hover:bg-gray-50">Current account</button>
              </div>
            </aside>
            <section className="min-h-[480px]">{children}</section>
          </div>
        </div>
      </div>
    </main>
  )
}
