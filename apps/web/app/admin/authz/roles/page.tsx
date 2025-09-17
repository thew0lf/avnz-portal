import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { ActionButton } from '@/components/admin/ActionButton'
import AdminRoleCreateForm from '@/components/admin/forms/AdminRoleCreateForm'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function AuthzRoles({ searchParams }: { searchParams?: { q?: string, offset?: string, limit?: string, sort?: string, dir?: 'asc'|'desc' } }){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/roles')
  const orgOverride = cookies().get('orgFilter')?.value || ''
  const nodeId = orgOverride || (session as any)?.orgUUID || ''
  const q = searchParams?.q || ''
  const limit = Number(searchParams?.limit || '20')
  const offset = Number(searchParams?.offset || '0')
  const res = await apiFetch(`/admin/roles?nodeId=${encodeURIComponent(nodeId)}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)
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
      <h1 className="text-xl font-semibold">AuthZ Roles</h1>
      <form action="/admin/authz/roles" className="flex gap-2 items-end">
        <Input name="q" placeholder="Search name" defaultValue={q} className="w-full md:w-64" />
        <Button type="submit">Search</Button>
      </form>
      <AdminRoleCreateForm />
      {q && (<div className="-mt-2 mb-2"><Badge variant="secondary">Search: {q}</Badge></div>)}
      <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><a href={`?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&sort=name&dir=${dir==='asc'?'desc':'asc'}`}>Name</a></TableHead>
            <TableHead><a href={`?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&sort=level&dir=${dir==='asc'?'desc':'asc'}`}>Level</a></TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(sort? sorted : rows).map((r:any)=>(
            <TableRow key={r.id}>
              <TableCell>{r.name}</TableCell>
              <TableCell>{r.level}</TableCell>
              <TableCell><ActionButton label="Delete" variant="secondary" method="DELETE" path={`/admin/roles/${encodeURIComponent(r.id)}`} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      <div className="md:hidden grid gap-2">
        {(sort? sorted : rows).map((r:any)=>(
          <div key={r.id} className="rounded border bg-white p-3">
            <div className="text-sm font-medium">{r.name}</div>
            <div className="mt-1"><Badge variant="secondary">Level {r.level}</Badge></div>
            <div className="mt-2"><ActionButton label="Delete" variant="secondary" method="DELETE" path={`/admin/roles/${encodeURIComponent(r.id)}`} /></div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <a className="underline" href={`/admin/authz/roles?q=${encodeURIComponent(q)}&limit=${limit}&offset=${prevOffset}`}>Prev</a>
        <span className="text-sm text-muted-foreground">Showing {rows.length} rows</span>
        <a className="underline" href={`/admin/authz/roles?q=${encodeURIComponent(q)}&limit=${limit}&offset=${nextOffset}`}>Next</a>
      </div>
    </main>
  )
}
