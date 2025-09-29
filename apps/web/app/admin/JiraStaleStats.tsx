import { cookies } from 'next/headers'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'

export default async function JiraStaleStats() {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) return null
  const minutes = 30
  let count = 0
  try {
    const r = await apiFetch(`/jira/stale?minutes=${minutes}`)
    const data = await r.json().catch(()=>({ issues: [] }))
    count = Array.isArray(data?.issues) ? data.issues.length : 0
  } catch {}
  return (
    <Card>
      <CardHeader className="px-4 py-3"><CardTitle className="text-base">Jira stale issues</CardTitle></CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-semibold">{count}</div>
        <div className="text-sm text-muted-foreground">Not updated in ≥ {minutes} minutes</div>
        <div className="mt-2 text-xs"><Link className="underline" href={`/admin/jira-monitor?minutes=${minutes}`}>Open Jira Monitor</Link></div>
      </CardContent>
    </Card>
  )
}