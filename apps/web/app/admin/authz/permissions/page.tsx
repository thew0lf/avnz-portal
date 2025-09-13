import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/admin/ActionButton'
import PermissionCreateForm from '@/components/admin/forms/PermissionCreateForm'

async function createPerm(formData: FormData){ 'use server'
  const nodeId = String(formData.get('nodeId')||'')
  const domain = String(formData.get('domain')||'')
  const resource_type = String(formData.get('resource_type')||'')
  const action_name = String(formData.get('action_name')||'')
  const min_role_id = String(formData.get('min_role_id')||'')
  await apiFetch(`/admin/permissions?nodeId=${encodeURIComponent(nodeId)}`, { method:'POST', body: JSON.stringify({ domain, resource_type, action_name, min_role_id }) })
  revalidatePath('/admin/authz/permissions')
}

export default async function AuthzPermissions({ searchParams }: { searchParams?: { q?: string, offset?: string, limit?: string } }){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/permissions')
  const nodeId = (session as any)?.orgUUID || ''
  const q = searchParams?.q || ''
  const limit = Number(searchParams?.limit || '20')
  const offset = Number(searchParams?.offset || '0')
  const res = await apiFetch(`/admin/permissions?nodeId=${encodeURIComponent(nodeId)}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)
  const data = await res.json().catch(()=>({rows:[]})); const rows = data.rows||[]
  const rolesRes = await apiFetch(`/admin/roles?nodeId=${encodeURIComponent(nodeId)}`)
  const roles = (await rolesRes.json().catch(()=>({rows:[]}))).rows||[]
  const actionsRes = await apiFetch(`/admin/actions?nodeId=${encodeURIComponent(nodeId)}`)
  const actions = (await actionsRes.json().catch(()=>({rows:[]}))).rows||[]
  // deletion handled via ActionButton
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">AuthZ Permissions</h1>
      <PermissionCreateForm defaultDomain="node" />
      <form action="/admin/authz/permissions" className="flex gap-2 items-end mt-2">
        <Input name="q" placeholder="Search domain.resource.action" defaultValue={q} className="w-64" />
        <Button type="submit">Search</Button>
      </form>
      <table className="min-w-full text-sm"><thead><tr><th className="text-left py-2 pr-4">Domain</th><th className="text-left py-2 pr-4">Resource</th><th className="text-left py-2 pr-4">Action</th><th className="text-left py-2 pr-4">Min Role</th><th className="py-2 pr-4">Actions</th></tr></thead>
        <tbody>{rows.map((p:any)=>(
          <tr key={p.id} className="border-b last:border-0">
            <td className="py-2 pr-4">{p.domain}</td>
            <td className="py-2 pr-4">{p.resource_type}</td>
            <td className="py-2 pr-4">{p.action_name}</td>
            <td className="py-2 pr-4">{p.min_role_id}</td>
            <td className="py-2 pr-4">
              <ActionButton label="Delete" variant="secondary" method="DELETE" path={`/admin/permissions/${encodeURIComponent(p.id)}`} />
            </td>
          </tr>
        ))}</tbody>
      </table>
      <div className="flex justify-between items-center">
        <a className="underline" href={`/admin/authz/permissions?q=${encodeURIComponent(q)}&limit=${limit}&offset=${Math.max(0, offset - limit)}`}>Prev</a>
        <span className="text-sm text-muted-foreground">Showing {rows.length} rows</span>
        <a className="underline" href={`/admin/authz/permissions?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset + limit}`}>Next</a>
      </div>
    </main>
  )
}
