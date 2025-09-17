import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import SecretsForm from './SecretsForm'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

// Client form is split into its own file (SecretsForm) and imported above.

export default async function SecretsPage(){
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/secrets')
  const orgOverride = cookies().get('orgFilter')?.value || ''
  const nodeId = orgOverride || (session as any)?.orgUUID || ''
  const [clientsRes, confRes] = await Promise.all([
    apiFetch('/clients'),
    apiFetch('/admin/services/configs?nodeId='+encodeURIComponent(nodeId)),
  ])
  const clients = (await clientsRes.json().catch(()=>({ rows: [] }))).rows||[]
  const configs = (await confRes.json().catch(()=>({ rows: [] }))).rows||[]
  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Service Secrets</h1></div>
      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base">Manage provider secrets</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm text-muted-foreground mb-3">Org-level defaults and optional client overrides. Values are encrypted at rest.</p>
          <SecretsForm clients={clients} configs={configs} nodeId={nodeId} />
        </CardContent>
      </Card>
    </main>
  )
}
