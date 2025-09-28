import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import ActionCreateForm from '@/components/admin/forms/ActionCreateForm'
import { ActionButton } from '@/components/admin/ActionButton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

async function createAction(formData: FormData){ 'use server'
  const name = String(formData.get('name')||''); const nodeId = String(formData.get('nodeId')||'')
  await apiFetch(`/admin/actions?nodeId=${encodeURIComponent(nodeId)}`, { method:'POST', body: JSON.stringify({ name }) })
  revalidatePath('/admin/authz/actions')
}

async function deleteAction(formData: FormData){ 'use server'
  const nodeId = String(formData.get('nodeId')||'')
  const name = String(formData.get('name')||'')
  await apiFetch(`/admin/actions/${encodeURIComponent(name)}?nodeId=${encodeURIComponent(nodeId)}`, { method:'DELETE' })
  revalidatePath('/admin/authz/actions')
}

export default async function AuthzActions({ searchParams }: { searchParams?: { q?: string, offset?: string, limit?: string, sort?: string, dir?: 'asc'|'desc', withDeleted?: string } }){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/actions')
  const orgOverride = cookies().get('orgFilter')?.value || ''
  const nodeId = orgOverride || (session as any)?.orgUUID || ''
  const q = searchParams?.q || ''
  const limit = Number(searchParams?.limit || '20')
  const offset = Number(searchParams?.offset || '0')
  const withDeleted = String(searchParams?.withDeleted||'')
  const res = await apiFetch(`/admin/actions?nodeId=${encodeURIComponent(nodeId)}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&include_deleted=${encodeURIComponent(withDeleted)}`)
  const data = await res.json().catch(()=>({rows:[]})); const rows = data.rows||[]
  const nextOffset = offset + limit
  const prevOffset = Math.max(0, offset - limit)
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
      <h1 className="text-xl font-semibold">AuthZ Actions</h1>
      <form action="/admin/authz/actions" className="flex gap-2 items-end">
        <Input name="q" placeholder="Search name" defaultValue={q} className="w-full md:w-64" />
        <Button type="submit">Search</Button>
      </form>
      <div className="text-sm">
        {withDeleted ? (
          <a className="underline" href={`/admin/authz/actions?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`}>Hide deleted</a>
        ) : (
          <a className="underline" href={`/admin/authz/actions?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&withDeleted=1`}>Show deleted</a>
        )}
      </div>
      {q && (<div className="-mt-2 mb-2"><Badge variant="secondary">Search: {q}</Badge></div>)}
      <ActionCreateForm />
      <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><a href={`?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&sort=name&dir=${dir==='asc'?'desc':'asc'}`}>Name</a></TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(sort? sorted : rows).map((r:any)=>(
            <TableRow key={r.name}>
              <TableCell className="flex items-center gap-2">{r.name} {r.deleted_at ? <Badge variant="destructive">Deleted</Badge> : null}</TableCell>
              <TableCell>{r.deleted_at ? <ActionButton label="Restore" variant="secondary" method="POST" path={`/admin/actions/${encodeURIComponent(r.name)}/restore`} /> : <ActionButton label="Delete" variant="secondary" method="DELETE" path={`/admin/actions/${encodeURIComponent(r.name)}`} />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      <div className="md:hidden grid gap-2">
        {(sort? sorted : rows).map((r:any)=>(
          <div key={r.name} className="rounded border bg-white p-3">
            <div className="text-sm font-medium flex items-center gap-2 break-words"><span>{r.name}</span><Badge variant="secondary">Action</Badge> {r.deleted_at ? <Badge variant="destructive">Deleted</Badge> : null}</div>
            <div className="mt-2">{r.deleted_at ? <ActionButton label="Restore" variant="secondary" method="POST" path={`/admin/actions/${encodeURIComponent(r.name)}/restore`} /> : <ActionButton label="Delete" variant="secondary" method="DELETE" path={`/admin/actions/${encodeURIComponent(r.name)}`} />}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <a className="underline" href={`/admin/authz/actions?q=${encodeURIComponent(q)}&limit=${limit}&offset=${prevOffset}${withDeleted?`&withDeleted=1`:''}`}>Prev</a>
        <span className="text-sm text-muted-foreground">Showing {rows.length} rows</span>
        <a className="underline" href={`/admin/authz/actions?q=${encodeURIComponent(q)}&limit=${limit}&offset=${nextOffset}${withDeleted?`&withDeleted=1`:''}`}>Next</a>
      </div>
    </main>
  )
}
