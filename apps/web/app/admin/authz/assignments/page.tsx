import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import AssignmentCreateForm from '@/components/admin/forms/AssignmentCreateForm'
import { ActionButton } from '@/components/admin/ActionButton'

async function createAssignment(formData: FormData){ 'use server'
  const nodeId = String(formData.get('nodeId')||'')
  const user_id = String(formData.get('user_id')||'')
  const node_id = String(formData.get('node_id')||'')
  const role_id = String(formData.get('role_id')||'')
  await apiFetch(`/admin/assignments?nodeId=${encodeURIComponent(nodeId)}`, { method:'POST', body: JSON.stringify({ user_id, node_id, role_id }) })
  revalidatePath('/admin/authz/assignments')
}

export default async function AssignmentsPage(){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/assignments')
  const nodeId = (session as any)?.orgUUID || ''
  const res = await apiFetch(`/admin/assignments?nodeId=${encodeURIComponent(nodeId)}`)
  const data = await res.json().catch(()=>({ rows: [] }))
  const rows = data.rows || []
  // deletion handled via ActionButton
  const rolesRes = await apiFetch(`/admin/roles?nodeId=${encodeURIComponent(nodeId)}`)
  const roles = (await rolesRes.json().catch(()=>({rows:[]}))).rows||[]
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Role Assignments</h1>
      <AssignmentCreateForm roleOptions={roles} />
      <table className="min-w-full text-sm"><thead><tr><th className="text-left py-2 pr-4">User</th><th className="text-left py-2 pr-4">Node</th><th className="text-left py-2 pr-4">Role</th><th className="py-2 pr-4">Actions</th></tr></thead>
        <tbody>{rows.map((r:any)=>(<tr key={r.id} className="border-b last:border-0"><td className="py-2 pr-4">{r.user_id}</td><td className="py-2 pr-4">{r.node_id}</td><td className="py-2 pr-4">{r.role_id}</td><td className="py-2 pr-4"><ActionButton label="Revoke" variant="secondary" method="DELETE" path={`/admin/assignments/${encodeURIComponent(r.id)}`} /></td></tr>))}</tbody>
      </table>
    </main>
  )
}
