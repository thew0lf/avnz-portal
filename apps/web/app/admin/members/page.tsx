import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
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
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
          <TableHeader>
            <tr><TableHead>Email</TableHead><TableHead>Username</TableHead><TableHead>Role</TableHead><TableHead>Since</TableHead><TableHead>Set Role</TableHead></tr>
          </TableHeader>
          <TableBody>
            {rows.map((r:any)=>(
              <TableRow key={r.user_id}>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.username||''}</TableCell>
                <TableCell>{r.role}</TableCell>
                <TableCell>{new Date(r.created_at).toLocaleString('en-US',{ timeZone:'UTC' })}</TableCell>
                <TableCell>
                  <SetMemberRoleForm identifier={r.email} roles={roles} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
