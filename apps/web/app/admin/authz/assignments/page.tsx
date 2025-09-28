import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import AssignmentCreateForm from '@/components/admin/forms/AssignmentCreateForm'
import { ActionButton } from '@/components/admin/ActionButton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

async function createAssignment(formData: FormData){ 'use server'
  const nodeId = String(formData.get('nodeId')||'')
  const user_id = String(formData.get('user_id')||'')
  const node_id = String(formData.get('node_id')||'')
  const role_id = String(formData.get('role_id')||'')
  await apiFetch(`/admin/assignments?nodeId=${encodeURIComponent(nodeId)}`, { method:'POST', body: JSON.stringify({ user_id, node_id, role_id }) })
  revalidatePath('/admin/authz/assignments')
}

export default async function AssignmentsPage({ searchParams }: { searchParams?: { sort?: string, dir?: 'asc'|'desc', withDeleted?: string } }){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/assignments')
  const orgOverride = cookies().get('orgFilter')?.value || ''
  const nodeId = orgOverride || (session as any)?.orgUUID || ''
  const withDeleted = String(searchParams?.withDeleted||'')
  const res = await apiFetch(`/admin/assignments?nodeId=${encodeURIComponent(nodeId)}&include_deleted=${encodeURIComponent(withDeleted)}`)
  const data = await res.json().catch(()=>({ rows: [] }))
  const rows = data.rows || []
  const sort = (searchParams?.sort||'').toLowerCase()
  const dir = (searchParams?.dir||'asc').toLowerCase()
  const sorted = [...rows].sort((a:any,b:any)=>{
    const vA = String(a[sort]||'').toLowerCase(); const vB = String(b[sort]||'').toLowerCase()
    if (vA < vB) return dir==='asc'? -1: 1
    if (vA > vB) return dir==='asc'? 1: -1
    return 0
  })
  // deletion handled via ActionButton
  const rolesRes = await apiFetch(`/admin/roles?nodeId=${encodeURIComponent(nodeId)}`)
  const roles = (await rolesRes.json().catch(()=>({rows:[]}))).rows||[]
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Role Assignments</h1>
      <AssignmentCreateForm roleOptions={roles} />
      <div className="text-sm">
        {withDeleted ? (
          <a className="underline" href={`/admin/authz/assignments`}>Hide deleted</a>
        ) : (
          <a className="underline" href={`/admin/authz/assignments?withDeleted=1`}>Show deleted</a>
        )}
      </div>
      <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><a href={`?sort=user_id&dir=${dir==='asc'?'desc':'asc'}`}>User</a></TableHead>
            <TableHead><a href={`?sort=node_id&dir=${dir==='asc'?'desc':'asc'}`}>Node</a></TableHead>
            <TableHead><a href={`?sort=role_id&dir=${dir==='asc'?'desc':'asc'}`}>Role</a></TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(sort? sorted : rows).map((r:any)=>(
            <TableRow key={r.id}>
              <TableCell className="flex items-center gap-2">{r.user_id} {r.deleted_at ? <span className="text-xs rounded bg-red-100 text-red-700 px-2 py-0.5">Deleted</span> : null}</TableCell>
              <TableCell>{r.node_id}</TableCell>
              <TableCell>{r.role_id}</TableCell>
              <TableCell>{r.deleted_at ? <ActionButton label="Restore" variant="secondary" method="POST" path={`/admin/assignments/${encodeURIComponent(r.id)}/restore`} /> : <ActionButton label="Revoke" variant="secondary" method="DELETE" path={`/admin/assignments/${encodeURIComponent(r.id)}`} />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      <div className="md:hidden grid gap-2">
        {(sort? sorted : rows).map((r:any)=>(
          <div key={r.id} className="rounded border bg-white p-3">
            <div className="text-sm font-medium break-words flex items-center gap-2">User: {r.user_id} {r.deleted_at ? <span className="text-xs rounded bg-red-100 text-red-700 px-2 py-0.5">Deleted</span> : null}</div>
            <div className="text-xs text-muted-foreground break-words">Node: {r.node_id} · Role: {r.role_id}</div>
            <div className="mt-2">{r.deleted_at ? <ActionButton label="Restore" variant="secondary" method="POST" path={`/admin/assignments/${encodeURIComponent(r.id)}/restore`} /> : <ActionButton label="Revoke" variant="secondary" method="DELETE" path={`/admin/assignments/${encodeURIComponent(r.id)}`} />}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
