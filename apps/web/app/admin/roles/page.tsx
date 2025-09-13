import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import RoleCreateForm from '@/components/admin/forms/RoleCreateForm'
import RolePermsForm from '@/components/admin/forms/RolePermsForm'
import RoleAssignForm from '@/components/admin/forms/RoleAssignForm'
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

      <RoleCreateForm />

      <div className="space-y-4">
        {rolesWithMembers.map((r:any)=>{
          const assigned = new Set<string>((r.permissions||[]) as string[])
          return (
            <div key={r.id} className="p-3 border rounded-md">
              <div className="font-medium">{r.name}</div>
              <div className="text-sm text-muted-foreground mb-2">{r.description||''}</div>
              <RolePermsForm roleId={r.id} perms={perms} assigned={assigned} />
              <div className="mt-3">
                <div className="text-sm font-medium">Members with this role</div>
                <ul className="list-disc pl-6 text-sm">
                  {r.members.map((m:any)=>(<li key={m.user_id}>{m.email} {m.username?`(${m.username})`:''}</li>))}
                </ul>
                <RoleAssignForm roleId={r.id} />
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
