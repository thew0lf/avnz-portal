import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/admin/ActionButton'
import PermissionCreateForm from '@/components/admin/forms/PermissionCreateForm'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

async function createPerm(formData: FormData){ 'use server'
  const nodeId = String(formData.get('nodeId')||'')
  const domain = String(formData.get('domain')||'')
  const resource_type = String(formData.get('resource_type')||'')
  const action_name = String(formData.get('action_name')||'')
  const min_role_id = String(formData.get('min_role_id')||'')
  await apiFetch(`/admin/permissions?nodeId=${encodeURIComponent(nodeId)}`, { method:'POST', body: JSON.stringify({ domain, resource_type, action_name, min_role_id }) })
  revalidatePath('/admin/authz/permissions')
}

export default async function AuthzPermissions({ searchParams }: { searchParams?: { q?: string, offset?: string, limit?: string, sort?: string, dir?: 'asc'|'desc', withDeleted?: string } }){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/permissions')
  const orgOverride = cookies().get('orgFilter')?.value || ''
  const nodeId = orgOverride || (session as any)?.orgUUID || ''
  const q = searchParams?.q || ''
  const limit = Number(searchParams?.limit || '20')
  const offset = Number(searchParams?.offset || '0')
  const withDeleted = String(searchParams?.withDeleted||'')
  const res = await apiFetch(`/admin/permissions?nodeId=${encodeURIComponent(nodeId)}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&include_deleted=${encodeURIComponent(withDeleted)}`)
  const data = await res.json().catch(()=>({rows:[]})); const rows = data.rows||[]
  const rolesRes = await apiFetch(`/admin/roles?nodeId=${encodeURIComponent(nodeId)}`)
  const roles = (await rolesRes.json().catch(()=>({rows:[]}))).rows||[]
  const actionsRes = await apiFetch(`/admin/actions?nodeId=${encodeURIComponent(nodeId)}`)
  const actions = (await actionsRes.json().catch(()=>({rows:[]}))).rows||[]
  // deletion handled via ActionButton
  const sort = (searchParams?.sort||'').toLowerCase()
  const dir = (searchParams?.dir||'asc').toLowerCase()
  const sorted = [...rows].sort((a:any,b:any)=>{
    const vA = String(a[sort]||'').toLowerCase(); const vB = String(b[sort]||'').toLowerCase()
    if (vA < vB) return dir==='asc'? -1: 1
    if (vA > vB) return dir==='asc'? 1: -1
    return 0
  })
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">AuthZ Permissions</h1>
      <PermissionCreateForm defaultDomain="node" />
      <form action="/admin/authz/permissions" className="flex gap-2 items-end mt-2">
        <Input name="q" placeholder="Search domain.resource.action" defaultValue={q} className="w-full md:w-64" />
        <Button type="submit">Search</Button>
      </form>
      <div className="text-sm">
        {withDeleted ? (
          <a className="underline" href={`/admin/authz/permissions?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`}>Hide deleted</a>
        ) : (
          <a className="underline" href={`/admin/authz/permissions?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&withDeleted=1`}>Show deleted</a>
        )}
      </div>
      {q && (<div className="-mt-2 mb-2"><Badge variant="secondary">Search: {q}</Badge></div>)}
      <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><a href={`?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&sort=domain&dir=${dir==='asc'?'desc':'asc'}`}>Domain</a></TableHead>
            <TableHead><a href={`?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&sort=resource_type&dir=${dir==='asc'?'desc':'asc'}`}>Resource</a></TableHead>
            <TableHead><a href={`?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&sort=action_name&dir=${dir==='asc'?'desc':'asc'}`}>Action</a></TableHead>
            <TableHead><a href={`?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&sort=min_role_id&dir=${dir==='asc'?'desc':'asc'}`}>Min Role</a></TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(sort? sorted : rows).map((p:any)=>(
            <TableRow key={p.id}>
              <TableCell className="flex items-center gap-2">{p.domain} {p.deleted_at ? <Badge variant="destructive">Deleted</Badge> : null}</TableCell>
              <TableCell>{p.resource_type}</TableCell>
              <TableCell>{p.action_name}</TableCell>
              <TableCell>{p.min_role_id}</TableCell>
              <TableCell>{p.deleted_at ? <ActionButton label="Restore" variant="secondary" method="POST" path={`/admin/permissions/${encodeURIComponent(p.id)}/restore`} /> : <ActionButton label="Delete" variant="secondary" method="DELETE" path={`/admin/permissions/${encodeURIComponent(p.id)}`} />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      <div className="md:hidden grid gap-2">
        {(sort? sorted : rows).map((p:any)=>(
          <div key={p.id} className="rounded border bg-white p-3">
            <div className="text-sm font-medium break-words flex items-center gap-2">{p.domain}.{p.resource_type}.{p.action_name} {p.deleted_at ? <Badge variant="destructive">Deleted</Badge> : null}</div>
            <div className="mt-1"><Badge variant="outline">Min role: {p.min_role_id}</Badge></div>
            <div className="mt-2">{p.deleted_at ? <ActionButton label="Restore" variant="secondary" method="POST" path={`/admin/permissions/${encodeURIComponent(p.id)}/restore`} /> : <ActionButton label="Delete" variant="secondary" method="DELETE" path={`/admin/permissions/${encodeURIComponent(p.id)}`} />}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <a className="underline" href={`/admin/authz/permissions?q=${encodeURIComponent(q)}&limit=${limit}&offset=${Math.max(0, offset - limit)}${withDeleted?`&withDeleted=1`:''}`}>Prev</a>
        <span className="text-sm text-muted-foreground">Showing {rows.length} rows</span>
        <a className="underline" href={`/admin/authz/permissions?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset + limit}${withDeleted?`&withDeleted=1`:''}`}>Next</a>
      </div>
    </main>
  )
}
