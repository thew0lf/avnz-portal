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

export default async function AbacPage(){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/abac')
  const nodeId = (session as any)?.orgUUID || ''
  const res = await apiFetch(`/admin/abac?nodeId=${encodeURIComponent(nodeId)}`)
  const data = await res.json().catch(()=>({ rows: [] }))
  const rows = data.rows || []
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">ABAC Fences</h1>
      <AbacFenceForm />
      <table className="min-w-full text-sm"><thead><tr><th className="text-left py-2 pr-4">Action</th><th className="text-left py-2 pr-4">Expression</th><th className="py-2 pr-4">Actions</th></tr></thead>
        <tbody>{rows.map((r:any)=>(
          <tr key={r.id} className="border-b last:border-0">
            <td className="py-2 pr-4">{r.action_name}</td>
            <td className="py-2 pr-4 whitespace-pre-wrap">
              <AbacExprEditor id={r.id} defaultValue={JSON.stringify(r.expr)} />
            </td>
            <td className="py-2 pr-4"><ActionButton label="Delete" variant="secondary" method="DELETE" path={`/admin/abac/${encodeURIComponent(r.id)}`} /></td>
          </tr>
        ))}</tbody>
      </table>
    </main>
  )
}
