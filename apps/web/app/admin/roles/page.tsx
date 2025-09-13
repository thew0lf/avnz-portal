import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { revalidatePath } from 'next/cache'

async function createRole(formData: FormData) {
  'use server'
  const name = String(formData.get('name') || '')
  const description = String(formData.get('description') || '')
  await apiFetch('/roles', { method: 'POST', body: JSON.stringify({ name, description }) })
  revalidatePath('/admin/roles')
}

async function setPerms(formData: FormData) {
  'use server'
  const id = String(formData.get('role_id') || '')
  const keys = formData.getAll('keys').map(v=>String(v)).filter(Boolean)
  await apiFetch(`/roles/${id}/permissions`, { method: 'POST', body: JSON.stringify({ keys }) })
  revalidatePath('/admin/roles')
}

async function assignToMember(formData: FormData) {
  'use server'
  const id = String(formData.get('role_id') || '')
  const identifier = String(formData.get('identifier') || '')
  await apiFetch(`/roles/${id}/assign`, { method: 'POST', body: JSON.stringify({ identifier }) })
  revalidatePath('/admin/roles')
}

export default async function RolesPage() {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/roles')
  if (!session.roles.includes('org') && !session.roles.includes('admin')) redirect('/unauthorized')

  const [rolesRes, permsRes] = await Promise.all([apiFetch('/roles'), apiFetch('/roles/permissions')])
  const roles = (await rolesRes.json()).rows || []
  const perms = (await permsRes.json()).rows || []
  const rolesWithMembers = await Promise.all(
    roles.map(async (r: any) => {
      const membersRes = await apiFetch(`/roles/${r.id}/members`)
      const members = (await membersRes.json()).rows || []
      return { ...r, members }
    })
  )

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Roles & Permissions</h1>

      <form action={createRole} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <div>
          <label className="block text-sm text-muted-foreground">Name</label>
          <Input name="name" placeholder="role name" required />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-muted-foreground">Description</label>
          <Input name="description" placeholder="description" />
        </div>
        <div>
          <Button type="submit">Create</Button>
        </div>
      </form>

      <div className="space-y-4">
        {rolesWithMembers.map((r:any)=>{
          const assigned = new Set<string>((r.permissions||[]) as string[])
          return (
            <div key={r.id} className="p-3 border rounded-md">
              <div className="font-medium">{r.name}</div>
              <div className="text-sm text-muted-foreground mb-2">{r.description||''}</div>
              <form action={setPerms} className="space-y-2">
                <input type="hidden" name="role_id" value={r.id} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {perms.map((p:any)=> (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="keys" value={p.key} defaultChecked={assigned.has(p.key)} />
                      {p.key}
                    </label>
                  ))}
                </div>
                <Button type="submit">Save Permissions</Button>
              </form>
              <div className="mt-3">
                <div className="text-sm font-medium">Members with this role</div>
                <ul className="list-disc pl-6 text-sm">
                  {r.members.map((m:any)=>(<li key={m.user_id}>{m.email} {m.username?`(${m.username})`:''}</li>))}
                </ul>
                <form action={assignToMember} className="flex gap-2 items-end mt-2">
                  <input type="hidden" name="role_id" value={r.id} />
                  <div className="grow">
                    <label className="block text-sm text-muted-foreground">Assign to user (email/username)</label>
                    <Input name="identifier" placeholder="user@example.com or username" />
                  </div>
                  <Button type="submit" variant="outline">Assign</Button>
                </form>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
