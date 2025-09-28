import { cookies } from 'next/headers'
import { getCookieName, verifyToken } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { apiBase } from '@/lib/api'
import JiraAssignees from './JiraAssignees'
import JiraEventsTable from './JiraEventsTable'
import BackfillButton from './BackfillButton'
import JiraAssigneeLoadTable from './JiraAssigneeLoadTable'

async function fetchEvents(limit=25){
  const token = cookies().get(getCookieName())?.value
  const r = await fetch(`${apiBase()}/jira/events?limit=${limit}`, { headers: token? { authorization: `Bearer ${token}` } : undefined, cache: 'no-store' })
  if (!r.ok) return []
  const j = await r.json().catch(()=>({ rows: [] }))
  return j.rows || []
}

async function fetchAssigneeLoad(){
  const token = cookies().get(getCookieName())?.value
  const r = await fetch(`${apiBase()}/jira/assignees/load`, { headers: token? { authorization: `Bearer ${token}` } : undefined, cache: 'no-store' })
  if (!r.ok) return []
  const j = await r.json().catch(()=>({ rows: [] }))
  return j.rows || []
}

export default async function JiraIntegrationPage(){
  const token = cookies().get(getCookieName())?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/dashboard/jira')
  if (!session.roles?.includes('org') && !session.roles?.includes('admin')) redirect('/unauthorized')
  const [events, loadRows] = await Promise.all([fetchEvents(50), fetchAssigneeLoad()])
  const hookPath = `/jira/events/:orgCode`
  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Jira Integration</h1></div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded bg-white p-4">
          <div className="text-sm font-medium mb-1">Webhook Endpoint (dev)</div>
          <div className="text-xs text-muted-foreground mb-2">Use ngrok public base for local development</div>
          <code className="text-xs break-all inline-block bg-gray-50 px-2 py-1 rounded border">{hookPath}</code>
          <div className="text-xs text-muted-foreground mt-2">Header: <span className="font-mono">X-Jira-Secret</span> (set per org in Secrets)</div>
        </div>
        <div className="border rounded bg-white p-4">
          <div className="text-sm font-medium mb-1">Queue In‑Progress</div>
          <div className="text-xs text-muted-foreground mb-2">Queues any issues currently In Progress</div>
          <BackfillButton />
        </div>
      </div>
      <div className="border rounded bg-white p-4">
        <div className="text-sm font-medium mb-2">Role Assignees (round‑robin / least‑loaded)</div>
        <JiraAssignees />
      </div>
      <div className="border rounded bg-white p-4">
        <div className="text-sm font-medium mb-2">Assignee Load (Open Issues)</div>
        <JiraAssigneeLoadTable rows={loadRows} />
      </div>
      <div className="border rounded bg-white p-4">
        <div className="text-sm font-medium mb-2">Recent Jira Events</div>
        <JiraEventsTable rows={events} />
      </div>
    </main>
  )
}
