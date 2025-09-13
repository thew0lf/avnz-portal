import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import ActionCreateForm from '@/components/admin/forms/ActionCreateForm'
import { ActionButton } from '@/components/admin/ActionButton'

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

export default async function AuthzActions({ searchParams }: { searchParams?: { q?: string, offset?: string, limit?: string } }){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/actions')
  const nodeId = (session as any)?.orgUUID || ''
  const q = searchParams?.q || ''
  const limit = Number(searchParams?.limit || '20')
  const offset = Number(searchParams?.offset || '0')
  const res = await apiFetch(`/admin/actions?nodeId=${encodeURIComponent(nodeId)}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)
  const data = await res.json().catch(()=>({rows:[]})); const rows = data.rows||[]
  const nextOffset = offset + limit
  const prevOffset = Math.max(0, offset - limit)
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">AuthZ Actions</h1>
      <form action="/admin/authz/actions" className="flex gap-2 items-end">
        <Input name="q" placeholder="Search name" defaultValue={q} className="w-64" />
        <Button type="submit">Search</Button>
      </form>
      <ActionCreateForm />
      <ul className="pl-0">
        {rows.map((r:any)=>(
          <li key={r.name} className="flex items-center justify-between border-b py-2">
            <span>{r.name}</span>
            <ActionButton label="Delete" variant="secondary" method="DELETE" path={`/admin/actions/${encodeURIComponent(r.name)}`} />
          </li>
        ))}
      </ul>
      <div className="flex justify-between items-center">
        <a className="underline" href={`/admin/authz/actions?q=${encodeURIComponent(q)}&limit=${limit}&offset=${prevOffset}`}>Prev</a>
        <span className="text-sm text-muted-foreground">Showing {rows.length} rows</span>
        <a className="underline" href={`/admin/authz/actions?q=${encodeURIComponent(q)}&limit=${limit}&offset=${nextOffset}`}>Next</a>
      </div>
    </main>
  )
}
