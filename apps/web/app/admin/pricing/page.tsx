import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, CommonColumn } from '@/components/ui/data-table'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
  const columns: CommonColumn<any>[] = [
    { accessorKey: 'scope', header: 'Scope', cell: ({ row }) => row.original.scope },
    { accessorKey: 'org_id', header: 'Org', cell: ({ row }) => row.original.org_id || '' },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => row.original.role || '' },
    { accessorKey: 'user_id', header: 'User', cell: ({ row }) => row.original.user_id || '' },
    { accessorKey: 'provider', header: 'Provider', cell: ({ row }) => row.original.provider },
    { accessorKey: 'model', header: 'Model', cell: ({ row }) => row.original.model },
    { accessorKey: 'metric', header: 'Metric', cell: ({ row }) => row.original.metric },
    { accessorKey: 'price_per_1k', header: '$/1k', cell: ({ row }) => Number(row.original.price_per_1k).toFixed(3) },
    { accessorKey: 'active', header: 'Active', cell: ({ row }) => String(row.original.active) },
  ]
  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Pricing Rules</h1></div>

      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Create rule</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <PricingRuleForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">All rules</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <DataTable data={rows} columns={columns} />
        </CardContent>
      </Card>
    </main>
  )
}
