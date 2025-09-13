import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { ActionButton } from '@/components/admin/ActionButton'
import AdminRoleCreateForm from '@/components/admin/forms/AdminRoleCreateForm'
import { Button } from '@/components/ui/button'

export default async function AuthzRoles({ searchParams }: { searchParams?: { q?: string, offset?: string, limit?: string } }){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/roles')
  const nodeId = (session as any)?.orgUUID || ''
  const q = searchParams?.q || ''
  const limit = Number(searchParams?.limit || '20')
  const offset = Number(searchParams?.offset || '0')
  const res = await apiFetch(`/admin/roles?nodeId=${encodeURIComponent(nodeId)}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)
  const data = await res.json().catch(()=>({rows:[]})); const rows = data.rows||[]
  const nextOffset = offset + limit
  const prevOffset = Math.max(0, offset - limit)
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">AuthZ Roles</h1>
      <form action="/admin/authz/roles" className="flex gap-2 items-end">
        <Input name="q" placeholder="Search name" defaultValue={q} className="w-64" />
        <Button type="submit">Search</Button>
      </form>
      <AdminRoleCreateForm />
      <table className="min-w-full text-sm"><thead><tr><th className="text-left py-2 pr-4">Name</th><th className="text-left py-2 pr-4">Level</th><th className="py-2 pr-4">Actions</th></tr></thead>
        <tbody>{rows.map((r:any)=>(
          <tr key={r.id} className="border-b last:border-0">
            <td className="py-2 pr-4">{r.name}</td>
            <td className="py-2 pr-4">{r.level}</td>
            <td className="py-2 pr-4">
              <ActionButton label="Delete" variant="secondary" method="DELETE" path={`/admin/roles/${encodeURIComponent(r.id)}`} />
            </td>
          </tr>
        ))}</tbody>
      </table>
      <div className="flex justify-between items-center">
        <a className="underline" href={`/admin/authz/roles?q=${encodeURIComponent(q)}&limit=${limit}&offset=${prevOffset}`}>Prev</a>
        <span className="text-sm text-muted-foreground">Showing {rows.length} rows</span>
        <a className="underline" href={`/admin/authz/roles?q=${encodeURIComponent(q)}&limit=${limit}&offset=${nextOffset}`}>Next</a>
      </div>
    </main>
  )
}
