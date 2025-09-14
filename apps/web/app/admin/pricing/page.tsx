import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
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
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Scope</TableHead>
              <TableHead>Org</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead>$/1k</TableHead>
              <TableHead>Active</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.scope}</TableCell>
                <TableCell>{r.org_id || ''}</TableCell>
                <TableCell>{r.role || ''}</TableCell>
                <TableCell>{r.user_id || ''}</TableCell>
                <TableCell>{r.provider}</TableCell>
                <TableCell>{r.model}</TableCell>
                <TableCell>{r.metric}</TableCell>
                <TableCell>{Number(r.price_per_1k).toFixed(3)}</TableCell>
                <TableCell>{String(r.active)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  )
}
