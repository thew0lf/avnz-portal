import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import JiraAssigneeLoadTable from '@/app/admin/dashboard/jira/JiraAssigneeLoadTable'
import JiraEventsTable from '@/app/admin/dashboard/jira/JiraEventsTable'
import JiraStaleTable from '@/app/admin/dashboard/jira/JiraStaleTable'
import JiraJobsTable from '@/app/admin/dashboard/jira/JiraJobsTable'
import { ActionButton } from '@/components/admin/ActionButton'

export default async function JiraMonitorPage({ searchParams }: { searchParams?: { minutes?: string } }){
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/jira-monitor')
  if (!session.roles.includes('org') && !session.roles.includes('admin')) redirect('/unauthorized')

  const minutes = Number(searchParams?.minutes || '30')

  const [loadRes, eventsRes, staleRes, jobsRes, healthRes] = await Promise.all([
    apiFetch('/jira/assignees/load'),
    apiFetch('/jira/events?limit=50'),
    apiFetch(`/jira/stale?minutes=${minutes}`),
    apiFetch('/jira/jobs?limit=50'),
    apiFetch('/jira/health'),
  ])
  const load = await loadRes.json().catch(()=>({ rows: [] }))
  const events = await eventsRes.json().catch(()=>({ rows: [] }))
  const stale = await staleRes.json().catch(()=>({ issues: [], minutes }))

  const rowsLoad = load.rows || []
  const rowsEvents = events.rows || []
  const rowsStale = stale.issues || []
  const rowsJobs = jobsRes.ok ? (await jobsRes.json().catch(()=>({ rows: [] }))).rows || [] : []
  const health = healthRes.ok ? (await healthRes.json().catch(()=>({}))) : {}
  function fmt(ts?: number){ if(!ts) return '—'; try{ return new Date(ts).toLocaleString() }catch{ return '—' } }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Jira Monitor</h1></div>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Assignee Load</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <JiraAssigneeLoadTable rows={rowsLoad} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Stale Issues (≥ {minutes}m)</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="flex items-center gap-3">
            <form action="/admin/jira-monitor" className="flex items-end gap-2">
              <label className="text-sm text-muted-foreground">Minutes</label>
              <input type="number" name="minutes" defaultValue={minutes} min={5} className="border rounded px-2 py-1 w-20" />
              <Button type="submit" variant="secondary">Update</Button>
            </form>
            <ActionButton path={`/jira/requeue-stale?minutes=${minutes}`} label="Requeue All Stale" variant="default" />
          </div>
          <JiraStaleTable rows={rowsStale} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Recent Jira Events</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <JiraEventsTable rows={rowsEvents} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Recent Portal Jobs</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <JiraJobsTable rows={rowsJobs} />
        </CardContent>
      </Card>
    </main>
  )
}
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Jira Automation Health</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 text-sm grid md:grid-cols-2 gap-3">
          <div>
            <div className="text-muted-foreground">Last Backfill</div>
            <div>{fmt(health?.backfill?.at)} {health?.backfill?.ok === false ? <span className="text-red-600">(failed)</span> : ''}</div>
            <div className="text-xs text-muted-foreground">Queued: {health?.backfill?.queued ?? 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Last Requeue</div>
            <div>{fmt(health?.requeue?.at)} {health?.requeue?.ok === false ? <span className="text-red-600">(failed)</span> : ''}</div>
            <div className="text-xs text-muted-foreground">Queued: {health?.requeue?.queued ?? 0}</div>
          </div>
        </CardContent>
      </Card>
