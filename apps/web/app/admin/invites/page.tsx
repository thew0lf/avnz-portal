import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DataTable, CommonColumn, makeActionsColumn } from '@/components/ui/data-table'
import InviteCreateForm from '@/components/admin/forms/InviteCreateForm'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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

  const columns: CommonColumn<any>[] = [
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => row.original.role || '-' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (row.original.revoked? 'revoked' : row.original.used_at? 'used' : 'pending') },
    { accessorKey: 'expires_at', header: 'Expires', cell: ({ row }) => (row.original.expires_at ? new Date(row.original.expires_at).toLocaleString('en-US', { timeZone:'UTC' }) : '-') },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => (!row.original.revoked && !row.original.used_at) ? (
        <ActionButton label="Revoke" variant="secondary" method="POST" path={`/clients/invites/${row.original.id}/revoke`} onDone={()=>{}} />
      ) : null
    },
  ]
  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Invites</h1></div>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Create invite</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <InviteCreateForm clients={clients} canSelectClient={canSelectClient} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">All invites</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <DataTable data={invites} columns={columns} />
        </CardContent>
      </Card>
    </main>
  )
}
