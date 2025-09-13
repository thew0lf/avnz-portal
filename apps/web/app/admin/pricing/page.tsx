import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PricingRuleForm from '@/components/admin/forms/PricingRuleForm'

// SPA handled via PricingRuleForm

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

      <PricingRuleForm />
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
