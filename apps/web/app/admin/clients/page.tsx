import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ClientCreateForm from '@/components/admin/forms/ClientCreateForm'
import { revalidatePath } from 'next/cache'

export default async function ClientsPage({ searchParams }: { searchParams?: { q?: string, offset?: string, limit?: string } }) {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/clients')
  if (!session.roles.includes('org') && !session.roles.includes('admin')) redirect('/unauthorized')

  const q = searchParams?.q || ''
  const limit = Number(searchParams?.limit || '20')
  const offset = Number(searchParams?.offset || '0')
  const res = await apiFetch(`/clients?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)
  const data = await res.json().catch(() => ({ rows: [] }))
  const rows = data.rows || []
  const nextOffset = offset + limit
  const prevOffset = Math.max(0, offset - limit)
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Clients</h1>
      <ClientCreateForm />
      <form action="/admin/clients" className="flex gap-2 items-end">
        <Input name="q" placeholder="Search clients" defaultValue={q} className="w-64" />
        <Button type="submit">Search</Button>
      </form>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-muted-foreground border-b">
            <tr><th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Manager</th><th className="py-2 pr-4">Created</th><th className="py-2 pr-4">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r:any)=>(
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 pr-4">{r.code}</td>
                <td className="py-2 pr-4">{r.name}</td>
                <td className="py-2 pr-4">{r.manager_email||'-'}</td>
                <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
                <td className="py-2 pr-4"><a className="underline" href="/admin/clients/manage">Manage</a></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between items-center mt-3">
          <a className="underline" href={`/admin/clients?q=${encodeURIComponent(q)}&limit=${limit}&offset=${prevOffset}`}>Prev</a>
          <span className="text-sm text-muted-foreground">Showing {rows.length} rows</span>
          <a className="underline" href={`/admin/clients?q=${encodeURIComponent(q)}&limit=${limit}&offset=${nextOffset}`}>Next</a>
        </div>
      </div>
    </main>
  )
}
