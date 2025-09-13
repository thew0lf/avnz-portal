import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { revalidatePath } from 'next/cache'

async function updateManager(formData: FormData) {
  'use server'
  const id = String(formData.get('client_id') || '')
  const identifier = String(formData.get('identifier') || '')
  await apiFetch(`/clients/${id}/manager`, { method: 'POST', body: JSON.stringify({ identifier }) })
  revalidatePath('/admin/clients/manage')
}

export default async function ManageClientsPage() {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/clients/manage')
  if (!session.roles.includes('org') && !session.roles.includes('admin')) redirect('/unauthorized')

  const res = await apiFetch('/clients')
  const data = await res.json().catch(() => ({ rows: [] }))
  const rows = data.rows || []
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Manage Client Managers</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-muted-foreground border-b">
            <tr><th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Set Manager (email/username)</th></tr>
          </thead>
          <tbody>
            {rows.map((r:any)=>(
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 pr-4">{r.code}</td>
                <td className="py-2 pr-4">{r.name}</td>
                <td className="py-2 pr-4">
                  <form action={updateManager} className="flex gap-2">
                    <input type="hidden" name="client_id" value={r.id} />
                    <Input name="identifier" placeholder="user@example.com or username" required />
                    <Button type="submit" variant="outline">Save</Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

