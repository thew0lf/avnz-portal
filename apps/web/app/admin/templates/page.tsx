import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import TemplateForms from './TemplateForms'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default async function TemplatesPage(){
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/templates')
  const orgOverride = cookies().get('orgFilter')?.value || ''
  const nodeId = orgOverride || (session as any)?.orgUUID || ''

  const [clientsRes, emailRes, smsRes] = await Promise.all([
    apiFetch('/clients'),
    apiFetch('/admin/templates/email?nodeId='+encodeURIComponent(nodeId)),
    apiFetch('/admin/templates/sms?nodeId='+encodeURIComponent(nodeId)),
  ])
  const clients = (await clientsRes.json().catch(()=>({ rows: [] }))).rows||[]
  const emailTemplates = (await emailRes.json().catch(()=>({ rows: [] }))).rows||[]
  const smsTemplates = (await smsRes.json().catch(()=>({ rows: [] }))).rows||[]

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Templates</h1></div>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Manage templates</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <TemplateForms clients={clients} emailTemplates={emailTemplates} smsTemplates={smsTemplates} />
        </CardContent>
      </Card>
    </main>
  )
}
