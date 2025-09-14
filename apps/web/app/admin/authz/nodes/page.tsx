import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import NodeCreateForm from '@/components/admin/forms/NodeCreateForm'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

async function createNode(formData: FormData){ 'use server'
  const parent_id = String(formData.get('parent_id')||'')
  const type = String(formData.get('type')||'')
  const name = String(formData.get('name')||'')
  await apiFetch('/nodes', { method:'POST', body: JSON.stringify({ parent_id, type, name }) })
  revalidatePath('/admin/authz/nodes')
}

export default async function AuthzNodes({ searchParams }: { searchParams?: { sort?: string, dir?: 'asc'|'desc' } }){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/nodes')
  const orgOverride = cookies().get('orgFilter')?.value || ''
  const orgNodeId = orgOverride || (session as any)?.orgUUID || ''
  // List direct children under org for simplicity
  const res = await apiFetch(`/nodes/${encodeURIComponent(orgNodeId)}/children`)
  const data = await res.json().catch(()=>({rows:[]})); const rows = data.rows||[]
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
      <h1 className="text-xl font-semibold">AuthZ Nodes</h1>
      <NodeCreateForm defaultParent={orgNodeId} />
      <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><a href={`?sort=type&dir=${dir==='asc'?'desc':'asc'}`}>Type</a></TableHead>
            <TableHead><a href={`?sort=slug&dir=${dir==='asc'?'desc':'asc'}`}>Slug</a></TableHead>
            <TableHead><a href={`?sort=name&dir=${dir==='asc'?'desc':'asc'}`}>Name</a></TableHead>
            <TableHead><a href={`?sort=path&dir=${dir==='asc'?'desc':'asc'}`}>Path</a></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(sort? sorted : rows).map((n:any)=>(
            <TableRow key={n.id}>
              <TableCell>{n.type}</TableCell>
              <TableCell>{n.slug}</TableCell>
              <TableCell>{n.name}</TableCell>
              <TableCell>{n.path}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      <div className="md:hidden grid gap-2">
        {(sort? sorted : rows).map((n:any)=>(
          <div key={n.id} className="rounded border bg-white p-3">
            <div className="text-sm font-medium">{n.name}</div>
            <div className="text-xs text-muted-foreground">{n.type} · {n.slug}</div>
            <div className="text-xs text-muted-foreground break-words">{n.path}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
