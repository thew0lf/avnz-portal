import { apiFetch } from '@/lib/api'
import OrdersTable from './OrdersTable'

async function loadToday() {
  const now = new Date(); const start = new Date(now); start.setHours(0,0,0,0)
  const qs = new URLSearchParams()
  qs.set('from', start.toISOString())
  qs.set('to', new Date(now.getTime()+1).toISOString())
  const r = await apiFetch(`/billing/orders?${qs.toString()}`)
  if (!r.ok) return { rows: [] as any[], total: 0 }
  return r.json()
}

export default async function OrdersPage(){
  const data = await loadToday()
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Orders</h1>
      <p className="text-sm text-muted-foreground">Billing → Orders (Today)</p>
      <div className="mt-4">
        <div className="text-sm text-muted-foreground mb-2">{data.total ?? 0} orders found</div>
        {(!data.rows || data.rows.length===0) ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <OrdersTable rows={data.rows} />
        )}
      </div>
    </div>
  )
}
