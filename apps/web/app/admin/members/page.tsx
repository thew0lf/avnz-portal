import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import MembersAddForm from '@/components/admin/forms/MembersAddForm'
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
      <h1 className="text-xl font-semibold">Members</h1>
      <MembersAddForm roles={roles} />
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-muted-foreground border-b">
            <tr><th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Username</th><th className="py-2 pr-4">Role</th><th className="py-2 pr-4">Since</th><th className="py-2 pr-4">Set Role</th></tr>
          </thead>
          <tbody>
            {rows.map((r:any)=>(
              <tr key={r.user_id} className="border-b last:border-0">
                <td className="py-2 pr-4">{r.email}</td>
                <td className="py-2 pr-4">{r.username||''}</td>
                <td className="py-2 pr-4">{r.role}</td>
                <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
                <td className="py-2 pr-4">
                  <SetMemberRoleForm identifier={r.email} roles={roles} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
