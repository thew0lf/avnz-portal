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

// SPA handled via RoutesUpsertForm and RouteRowEditor

export default async function AuthzRoutes({ searchParams }: { searchParams?: { q?: string, offset?: string, limit?: string } }){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/authz/routes')
  const nodeId = (session as any)?.orgUUID || ''
  const q = searchParams?.q || ''
  const limit = Number(searchParams?.limit || '20')
  const offset = Number(searchParams?.offset || '0')
  const res = await apiFetch(`/admin/routes?nodeId=${encodeURIComponent(nodeId)}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)
  const data = await res.json().catch(()=>({ rows: [] }))
  const rows = data.rows || []
  const nextOffset = offset + limit
  const prevOffset = Math.max(0, offset - limit)
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">AuthZ Route Registry</h1>
      <form action="/admin/authz/routes" className="flex gap-2 items-end">
        <Input name="q" placeholder="Search path" defaultValue={q} className="w-64" />
        <Button type="submit">Search</Button>
      </form>
      <RoutesUpsertForm />
      <table className="min-w-full text-sm"><thead><tr><th className="text-left py-2 pr-4">Method</th><th className="text-left py-2 pr-4">Path</th><th className="text-left py-2 pr-4">Domain</th><th className="text-left py-2 pr-4">Resource</th><th className="text-left py-2 pr-4">Action</th><th className="text-left py-2 pr-4">Param</th><th className="py-2 pr-4">Actions</th></tr></thead>
        <tbody>
          {rows.map((r:any)=>(
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{r.method}</td>
              <td className="py-2 pr-4">{r.path}</td>
              <RouteRowEditor row={r} />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-between items-center">
        <a className="underline" href={`/admin/authz/routes?q=${encodeURIComponent(q)}&limit=${limit}&offset=${prevOffset}`}>Prev</a>
        <span className="text-sm text-muted-foreground">Showing {rows.length} rows</span>
        <a className="underline" href={`/admin/authz/routes?q=${encodeURIComponent(q)}&limit=${limit}&offset=${nextOffset}`}>Next</a>
      </div>
    </main>
  )
}
