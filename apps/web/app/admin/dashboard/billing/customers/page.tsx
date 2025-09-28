import { apiFetch } from '@/lib/api'
import CustomersTable from './CustomersTable'

async function loadToday(){
  const now = new Date(); const start = new Date(now); start.setHours(0,0,0,0)
  const qs = new URLSearchParams()
  qs.set('from', start.toISOString())
  qs.set('to', new Date(now.getTime()+1).toISOString())
  const r = await apiFetch(`/billing/customers?${qs.toString()}`)
  if (!r.ok) return { rows: [] as any[], total: 0 }
  return r.json()
}

export default async function BillingCustomers(){
  const data = await loadToday()
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Customers</h1>
      <p className="text-sm text-muted-foreground">Billing → Customers (Today)</p>
      <div className="mt-4">
        <div className="text-sm text-muted-foreground mb-2">{data.total ?? 0} customers found</div>
        {(!data.rows || data.rows.length===0) ? (
          <p className="text-sm text-muted-foreground">No customers yet.</p>
        ) : (
          <CustomersTable rows={data.rows} />
        )}
      </div>
    </div>
  )
}
