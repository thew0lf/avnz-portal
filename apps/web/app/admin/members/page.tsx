import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { revalidatePath } from 'next/cache'

async function addMember(formData: FormData) {
  'use server'
  const identifier = String(formData.get('identifier') || '')
  const role = String(formData.get('role') || 'user')
  const role_id = String(formData.get('role_id') || '')
  await apiFetch('/memberships', { method: 'POST', body: JSON.stringify({ identifier, role, role_id: role_id || undefined }) })
  revalidatePath('/admin/members')
}

async function setMemberRole(formData: FormData) {
  'use server'
  const identifier = String(formData.get('identifier') || '')
  const role_id = String(formData.get('role_id') || '')
  await apiFetch('/memberships', { method: 'POST', body: JSON.stringify({ identifier, role_id }) })
  revalidatePath('/admin/members')
}

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
      <form action={addMember} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
        <div>
          <label className="block text-sm text-muted-foreground">Email or Username</label>
          <Input name="identifier" placeholder="user@example.com or username" required />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Role</label>
          <Input name="role" placeholder="user|org|admin" defaultValue="user" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Role (select)</label>
          <Select name="role_id">
            <option value="">-- optional --</option>
            {roles.map((r:any)=>(<option key={r.id} value={r.id}>{r.name}</option>))}
          </Select>
        </div>
        <div>
          <Button type="submit">Add / Update</Button>
        </div>
      </form>
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
                  <form action={setMemberRole} className="flex gap-2 items-center">
                    <input type="hidden" name="identifier" value={r.email} />
                    <Select name="role_id" defaultValue="">
                      <option value="">-- choose --</option>
                      {roles.map((x:any)=>(<option key={x.id} value={x.id}>{x.name}</option>))}
                    </Select>
                    <Button type="submit" variant="outline">Save</Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
