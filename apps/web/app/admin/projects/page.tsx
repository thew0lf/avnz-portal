import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { revalidatePath } from 'next/cache'

async function createProject(formData: FormData) {
  'use server'
  const code = String(formData.get('code') || '')
  const name = String(formData.get('name') || '')
  const client_code = String(formData.get('client_code') || '')
  await apiFetch('/projects', { method: 'POST', body: JSON.stringify({ code: code || undefined, name, client_code: client_code || undefined }) })
  revalidatePath('/admin/projects')
}

export default async function ProjectsPage() {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/projects')
  if (!session.roles.includes('org') && !session.roles.includes('admin')) redirect('/unauthorized')

  const res = await apiFetch('/projects')
  const data = await res.json().catch(() => ({ rows: [] }))
  const rows = data.rows || []
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Projects</h1>
      <form action={createProject} className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
        <div>
          <label className="block text-sm text-muted-foreground">Name</label>
          <Input name="name" placeholder="New project" required />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Code (optional)</label>
          <Input name="code" placeholder="short-code" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Client Code (optional)</label>
          <Input name="client_code" placeholder="client short code" />
        </div>
        <div>
          <Button type="submit">Create</Button>
        </div>
      </form>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-muted-foreground border-b">
            <tr><th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Client</th><th className="py-2 pr-4">Created</th></tr>
          </thead>
          <tbody>
            {rows.map((r:any)=>(
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 pr-4">{r.code||''}</td>
                <td className="py-2 pr-4">{r.name}</td>
                <td className="py-2 pr-4">{r.client_code||''}</td>
                <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

