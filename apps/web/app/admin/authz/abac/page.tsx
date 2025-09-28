import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import AbacFenceForm from '@/components/admin/forms/AbacFenceForm'
import { ActionButton } from '@/components/admin/ActionButton'
import AbacExprEditor from '@/components/admin/forms/AbacExprEditor'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default async function AbacPage({ searchParams }: { searchParams?: { withDeleted?: string } }){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/abac')
  const orgOverride = cookies().get('orgFilter')?.value || ''
  const nodeId = orgOverride || (session as any)?.orgUUID || ''
  const withDeleted = String(searchParams?.withDeleted||'')
  const res = await apiFetch(`/admin/abac?nodeId=${encodeURIComponent(nodeId)}&include_deleted=${encodeURIComponent(withDeleted)}`)
  const data = await res.json().catch(()=>({ rows: [] }))
  const rows = data.rows || []
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">ABAC Fences</h1>
      <AbacFenceForm />
      <div className="text-sm">
        {withDeleted ? (
          <a className="underline" href={`/admin/authz/abac`}>Hide deleted</a>
        ) : (
          <a className="underline" href={`/admin/authz/abac?withDeleted=1`}>Show deleted</a>
        )}
      </div>
      <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Expression</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r:any)=>(
            <TableRow key={r.id}>
              <TableCell className="flex items-center gap-2">{r.action_name} {r.deleted_at ? <span className="text-xs rounded bg-red-100 text-red-700 px-2 py-0.5">Deleted</span> : null}</TableCell>
              <TableCell className="whitespace-pre-wrap"><AbacExprEditor id={r.id} defaultValue={JSON.stringify(r.expr)} /></TableCell>
              <TableCell>{r.deleted_at ? <ActionButton label="Restore" variant="secondary" method="POST" path={`/admin/abac/${encodeURIComponent(r.id)}/restore`} /> : <ActionButton label="Delete" variant="secondary" method="DELETE" path={`/admin/abac/${encodeURIComponent(r.id)}`} />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      <div className="md:hidden grid gap-2">
        {rows.map((r:any)=>(
          <div key={r.id} className="rounded border bg-white p-3">
            <div className="text-sm font-medium flex items-center gap-2">{r.action_name} {r.deleted_at ? <span className="text-xs rounded bg-red-100 text-red-700 px-2 py-0.5">Deleted</span> : null}</div>
            <div className="mt-2"><AbacExprEditor id={r.id} defaultValue={JSON.stringify(r.expr)} /></div>
            <div className="mt-2">{r.deleted_at ? <ActionButton label="Restore" variant="secondary" method="POST" path={`/admin/abac/${encodeURIComponent(r.id)}/restore`} /> : <ActionButton label="Delete" variant="secondary" method="DELETE" path={`/admin/abac/${encodeURIComponent(r.id)}`} />}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
