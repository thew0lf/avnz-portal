import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { apiFetch } from '@/lib/api'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import DocumentIngestForm from '@/components/admin/forms/DocumentIngestForm'

export default async function DocumentsPage() {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/documents')
  const projRes = await apiFetch('/projects/mine')
  const projects = (await projRes.json()).rows || []

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Documents</h1>

      <Card>
        <CardHeader>
          <CardTitle>Ingest Document</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentIngestForm projects={projects} />
        </CardContent>
      </Card>
    </main>
  )
}
