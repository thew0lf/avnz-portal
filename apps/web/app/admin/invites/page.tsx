import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

async function createInvite(formData: FormData) {
  'use server'
  const email = String(formData.get('email') || '')
  const client_id = String(formData.get('client_id') || '')
  const role = String(formData.get('role') || '') || 'user'
  const body: any = { email, role }
  if (client_id) body.client_id = client_id
  await apiFetch('/clients/invite', { method: 'POST', body: JSON.stringify(body) })
  revalidatePath('/admin/invites')
}

async function revokeInvite(formData: FormData) {
  'use server'
  const id = String(formData.get('id') || '')
  await apiFetch(`/clients/invites/${id}/revoke`, { method: 'POST' })
  revalidatePath('/admin/invites')
}

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
      <form action={createInvite} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <Label className="block text-sm text-muted-foreground">Email</Label>
          <Input name="email" type="email" placeholder="user@example.com" required />
        </div>
        {canSelectClient && (
          <div>
            <Label className="block text-sm text-muted-foreground">Client</Label>
            <Select name="client_id" required>
              <option value="">Select client</option>
              {clients.map((c:any)=>(<option key={c.id} value={c.id}>{c.name} ({c.code})</option>))}
            </Select>
          </div>
        )}
        <div>
          <Label className="block text-sm text-muted-foreground">Role</Label>
          <Select name="role" defaultValue="user">
            <option value="user">user</option>
            <option value="client-admin">client-admin</option>
            <option value="client-user">client-user</option>
          </Select>
        </div>
        <div>
          <Button type="submit">Send Invite</Button>
        </div>
      </form>

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
                    <form action={revokeInvite}>
                      <input type="hidden" name="id" value={iv.id} />
                      <Button type="submit" variant="secondary">Revoke</Button>
                    </form>
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

