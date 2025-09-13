import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import NodeCreateForm from '@/components/admin/forms/NodeCreateForm'

async function createNode(formData: FormData){ 'use server'
  const parent_id = String(formData.get('parent_id')||'')
  const type = String(formData.get('type')||'')
  const name = String(formData.get('name')||'')
  await apiFetch('/nodes', { method:'POST', body: JSON.stringify({ parent_id, type, name }) })
  revalidatePath('/admin/authz/nodes')
}

export default async function AuthzNodes(){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/nodes')
  const orgNodeId = (session as any)?.orgUUID || ''
  // List direct children under org for simplicity
  const res = await apiFetch(`/nodes/${encodeURIComponent(orgNodeId)}/children`)
  const data = await res.json().catch(()=>({rows:[]})); const rows = data.rows||[]
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">AuthZ Nodes</h1>
      <NodeCreateForm defaultParent={orgNodeId} />
      <table className="min-w-full text-sm"><thead><tr><th className="text-left py-2 pr-4">Type</th><th className="text-left py-2 pr-4">Slug</th><th className="text-left py-2 pr-4">Name</th><th className="text-left py-2 pr-4">Path</th></tr></thead>
        <tbody>{rows.map((n:any)=>(<tr key={n.id} className="border-b last:border-0"><td className="py-2 pr-4">{n.type}</td><td className="py-2 pr-4">{n.slug}</td><td className="py-2 pr-4">{n.name}</td><td className="py-2 pr-4">{n.path}</td></tr>))}</tbody>
      </table>
    </main>
  )
}
