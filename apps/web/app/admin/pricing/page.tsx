import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PricingTable from './PricingTable'
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
          <PricingTable rows={rows} />
        </CardContent>
      </Card>
    </main>
  )
}
