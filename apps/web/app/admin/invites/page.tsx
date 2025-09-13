import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import InviteCreateForm from '@/components/admin/forms/InviteCreateForm'
import { ActionButton } from '@/components/admin/ActionButton'

// SPA handled via InviteCreateForm and ActionButton

export default async function InvitesPage() {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/invites')
  const perms = Array.isArray((session as any).perms) ? (session as any).perms as string[] : []
  const isOrgManager = perms.includes('admin') || perms.includes('manage_members')
  const canSelectClient = isOrgManager && perms.includes('manage_clients')

  const invitesRes = await apiFetch('/clients/invites')
  const invitesData = await invitesRes.json().catch(()=>({ rows: [] }))
  const invites = invitesData.rows || []

  let clients: any[] = []
  if (canSelectClient) {
    const clientsRes = await apiFetch('/clients')
    const clientsData = await clientsRes.json().catch(()=>({ rows: [] }))
    clients = clientsData.rows || []
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Invites</h1>
      <InviteCreateForm clients={clients} canSelectClient={canSelectClient} />

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-muted-foreground border-b">
            <tr>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Expires</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((iv:any)=>(
              <tr key={iv.id} className="border-b last:border-0">
                <td className="py-2 pr-4">{iv.email}</td>
                <td className="py-2 pr-4">{iv.role || '-'}</td>
                <td className="py-2 pr-4">{iv.revoked? 'revoked' : iv.used_at? 'used' : 'pending'}</td>
                <td className="py-2 pr-4">{iv.expires_at ? new Date(iv.expires_at).toLocaleString() : '-'}</td>
                <td className="py-2 pr-4">
                  {!iv.revoked && !iv.used_at && (
                    <ActionButton label="Revoke" variant="secondary" method="POST" path={`/clients/invites/${iv.id}/revoke`} onDone={()=>{ /* SSR list */ }} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
