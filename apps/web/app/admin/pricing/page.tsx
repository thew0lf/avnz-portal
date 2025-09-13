import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

async function createRule(formData: FormData) {
  'use server'
  const payload = {
    scope: String(formData.get('scope') || ''),
    org_id: String(formData.get('org_id') || '') || null,
    role: String(formData.get('role') || '') || null,
    user_id: String(formData.get('user_id') || '') || null,
    provider: String(formData.get('provider') || ''),
    model: String(formData.get('model') || ''),
    metric: String(formData.get('metric') || ''),
    price_per_1k: Number(formData.get('price_per_1k') || '0'),
    currency: 'USD',
    active: true,
  }
  await apiFetch('/pricing/rules', { method: 'POST', body: JSON.stringify(payload) })
  revalidatePath('/admin/pricing')
}

export default async function PricingPage() {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/pricing')
  const hasAdmin = session.roles.includes('org') || session.roles.includes('admin')
  if (!hasAdmin) redirect('/unauthorized')

  const res = await apiFetch('/pricing/rules')
  if (!res.ok) {
    return <div className="p-6">Failed to load pricing rules</div>
  }
  const data = await res.json()
  const rows: any[] = data.rows || []
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Pricing Rules</h1>

      <form action={createRule} className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
        <div>
          <label className="block text-sm text-muted-foreground">Scope</label>
          <Input name="scope" placeholder="default|org|role|user" required />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Org ID</label>
          <Input name="org_id" placeholder="demo" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Role</label>
          <Input name="role" placeholder="Enterprise" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">User ID</label>
          <Input name="user_id" placeholder="alice" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Provider</label>
          <Input name="provider" placeholder="bedrock|openai" required />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Model</label>
          <Input name="model" placeholder="model name" required />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Metric</label>
          <Input name="metric" placeholder="input_tokens|output_tokens|embed_tokens" required />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">$/1k</label>
          <Input name="price_per_1k" type="number" step="0.001" placeholder="0.200" required />
        </div>
        <div>
          <Button type="submit">Add Rule</Button>
        </div>
      </form>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-muted-foreground border-b">
            <tr>
              <th className="py-2 pr-4">Scope</th>
              <th className="py-2 pr-4">Org</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Provider</th>
              <th className="py-2 pr-4">Model</th>
              <th className="py-2 pr-4">Metric</th>
              <th className="py-2 pr-4">$/1k</th>
              <th className="py-2 pr-4">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 pr-4">{r.scope}</td>
                <td className="py-2 pr-4">{r.org_id || ''}</td>
                <td className="py-2 pr-4">{r.role || ''}</td>
                <td className="py-2 pr-4">{r.user_id || ''}</td>
                <td className="py-2 pr-4">{r.provider}</td>
                <td className="py-2 pr-4">{r.model}</td>
                <td className="py-2 pr-4">{r.metric}</td>
                <td className="py-2 pr-4">{Number(r.price_per_1k).toFixed(3)}</td>
                <td className="py-2 pr-4">{String(r.active)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
