import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { revalidatePath } from 'next/cache'

async function createClient(formData: FormData) {
  'use server'
  const name = String(formData.get('name') || '')
  await apiFetch('/clients/register', { method: 'POST', body: JSON.stringify({ name }) })
  revalidatePath('/admin/clients')
}

export default async function ClientsPage() {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/clients')
  if (!session.roles.includes('org') && !session.roles.includes('admin')) redirect('/unauthorized')

  const res = await apiFetch('/clients')
  const data = await res.json().catch(() => ({ rows: [] }))
  const rows = data.rows || []
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Clients</h1>
      <form action={createClient} className="flex gap-2 items-end">
        <div>
          <label className="block text-sm text-muted-foreground">Name</label>
          <Input name="name" placeholder="New client name" required />
        </div>
        <Button type="submit">Create</Button>
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
      </div>
    </main>
  )
}
