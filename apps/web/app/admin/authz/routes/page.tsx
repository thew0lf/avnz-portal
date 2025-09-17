import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import RoutesUpsertForm from '@/components/admin/forms/RoutesUpsertForm'
import { ActionButton } from '@/components/admin/ActionButton'
import RouteRowEditor from '@/components/admin/forms/RouteRowEditor'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

// SPA handled via RoutesUpsertForm and RouteRowEditor

export default async function AuthzRoutes({ searchParams }: { searchParams?: { q?: string, offset?: string, limit?: string, sort?: string, dir?: 'asc'|'desc' } }){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/routes')
  const orgOverride = cookies().get('orgFilter')?.value || ''
  const nodeId = orgOverride || (session as any)?.orgUUID || ''
  const q = searchParams?.q || ''
  const limit = Number(searchParams?.limit || '20')
  const offset = Number(searchParams?.offset || '0')
  const res = await apiFetch(`/admin/routes?nodeId=${encodeURIComponent(nodeId)}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)
  const data = await res.json().catch(()=>({ rows: [] }))
  const rows = data.rows || []
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
      <h1 className="text-xl font-semibold">AuthZ Route Registry</h1>
      <form action="/admin/authz/routes" className="flex gap-2 items-end">
        <Input name="q" placeholder="Search path" defaultValue={q} className="w-64" />
        <Button type="submit">Search</Button>
      </form>
      <RoutesUpsertForm />
      {q && (<div className="-mt-2 mb-2"><Badge variant="secondary">Search: {q}</Badge></div>)}
      <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><a href={`?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&sort=method&dir=${dir==='asc'?'desc':'asc'}`}>Method</a></TableHead>
            <TableHead><a href={`?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&sort=path&dir=${dir==='asc'?'desc':'asc'}`}>Path</a></TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Param</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(sort? sorted : rows).map((r:any)=>(
            <TableRow key={r.id}>
              <TableCell>{r.method}</TableCell>
              <TableCell>{r.path}</TableCell>
              <RouteRowEditor row={r} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      <div className="md:hidden grid gap-2">
        {(sort? sorted : rows).map((r:any)=>(
          <div key={r.id} className="rounded border bg-white p-3">
            <div className="text-sm font-medium mb-1 break-all">{r.method} {r.path}</div>
            <div className="text-xs text-muted-foreground">{r.domain}.{r.resource_type}.{r.action_name} · param: {r.resource_param||'-'}</div>
            <div className="mt-2">
              <RouteRowEditor row={r} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <a className="underline" href={`/admin/authz/routes?q=${encodeURIComponent(q)}&limit=${limit}&offset=${prevOffset}`}>Prev</a>
        <span className="text-sm text-muted-foreground">Showing {rows.length} rows</span>
        <a className="underline" href={`/admin/authz/routes?q=${encodeURIComponent(q)}&limit=${limit}&offset=${nextOffset}`}>Next</a>
      </div>
    </main>
  )
}
