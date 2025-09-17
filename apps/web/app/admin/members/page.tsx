import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DataTable, CommonColumn } from '@/components/ui/data-table'
import MembersAddForm from '@/components/admin/forms/MembersAddForm'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import SetMemberRoleForm from '@/components/admin/forms/SetMemberRoleForm'
import { revalidatePath } from 'next/cache'

export default async function MembersPage() {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/members')
  if (!session.roles.includes('org') && !session.roles.includes('admin')) redirect('/unauthorized')

  const [res, rolesRes] = await Promise.all([apiFetch('/memberships'), apiFetch('/roles')])
  const data = await res.json().catch(() => ({ rows: [] }))
  const rows = data.rows || []
  const roles = (await rolesRes.json()).rows || []
  const columns: CommonColumn<any>[] = [
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email },
    { accessorKey: 'username', header: 'Username', cell: ({ row }) => row.original.username || '' },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => row.original.role },
    { accessorKey: 'created_at', header: 'Since', cell: ({ row }) => new Date(row.original.created_at).toLocaleString('en-US', { timeZone:'UTC' }) },
    { id: 'set_role', header: 'Set Role', cell: ({ row }) => (<SetMemberRoleForm identifier={row.original.email} roles={roles} />) },
  ]
  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Members</h1></div>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Invite or add member</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <MembersAddForm roles={roles} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">All members</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <DataTable data={rows} columns={columns} />
        </CardContent>
      </Card>
    </main>
  )
}
