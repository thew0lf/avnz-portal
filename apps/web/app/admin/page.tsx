import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import Link from 'next/link'
import { DashboardUsageChart, DashboardMetrics } from './DashboardUsage'
import OutboxStats from './OutboxStats'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default async function AdminHome() {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin')
  const hasAdmin = session.roles.includes('org') || session.roles.includes('admin')
  if (!hasAdmin) redirect('/unauthorized')

  // Load basic data for intro state
  const clientsRes = await apiFetch('/clients')
  const clientsData = await clientsRes.json().catch(()=>({ rows: [] }))
  const clients = clientsData.rows || []

  const showFirstClientCta = clients.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>

      {showFirstClientCta && (
        <Card>
          <CardContent className="p-4">
            <div className="font-medium">Create your first client</div>
            <p className="text-sm text-muted-foreground mt-1">
              You don’t have any clients yet. Create a client to organize projects and manage access.
            </p>
            <div className="mt-3 flex gap-2">
              <Link href="/admin/clients" className="inline-flex items-center px-3 py-1.5 rounded bg-black text-white text-sm">Create client</Link>
              <Link href="/admin/projects" className="inline-flex items-center px-3 py-1.5 rounded border text-sm">Skip for now</Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Usage overview</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 min-h-[280px]">
            <DashboardUsageChart />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader className="px-4 py-3"><CardTitle className="text-base">Quick links</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <ul className="mt-2 text-sm space-y-1">
                <li><Link className="underline" href="/admin/clients">Manage clients</Link></li>
                <li><Link className="underline" href="/admin/members">Invite members</Link></li>
                <li><Link className="underline" href="/admin/pricing">Set pricing rules</Link></li>
                <li><Link className="underline" href="/admin/templates">Message templates</Link></li>
                <li><Link className="underline" href="/admin/outbox">Outbox</Link></li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="px-4 py-3"><CardTitle className="text-base">Key metrics</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <DashboardMetrics />
            </CardContent>
          </Card>
          <OutboxStats />
        </div>
      </div>
    </div>
  )
}
