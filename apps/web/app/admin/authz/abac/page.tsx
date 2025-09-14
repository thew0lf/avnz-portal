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

export default async function AbacPage(){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/abac')
  const orgOverride = cookies().get('orgFilter')?.value || ''
  const nodeId = orgOverride || (session as any)?.orgUUID || ''
  const res = await apiFetch(`/admin/abac?nodeId=${encodeURIComponent(nodeId)}`)
  const data = await res.json().catch(()=>({ rows: [] }))
  const rows = data.rows || []
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">ABAC Fences</h1>
      <AbacFenceForm />
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
              <TableCell>{r.action_name}</TableCell>
              <TableCell className="whitespace-pre-wrap"><AbacExprEditor id={r.id} defaultValue={JSON.stringify(r.expr)} /></TableCell>
              <TableCell><ActionButton label="Delete" variant="secondary" method="DELETE" path={`/admin/abac/${encodeURIComponent(r.id)}`} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      <div className="md:hidden grid gap-2">
        {rows.map((r:any)=>(
          <div key={r.id} className="rounded border bg-white p-3">
            <div className="text-sm font-medium">{r.action_name}</div>
            <div className="mt-2"><AbacExprEditor id={r.id} defaultValue={JSON.stringify(r.expr)} /></div>
            <div className="mt-2"><ActionButton label="Delete" variant="secondary" method="DELETE" path={`/admin/abac/${encodeURIComponent(r.id)}`} /></div>
          </div>
        ))}
      </div>
    </main>
  )
}
