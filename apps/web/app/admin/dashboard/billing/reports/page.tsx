import { apiFetch } from '@/lib/api'

async function countsToday(){
  const now = new Date()
  const start = new Date(now)
  start.setHours(0,0,0,0)
  const from = start.toISOString()
  const to = new Date(now.getTime()+1).toISOString()
  const [o, c, t] = await Promise.all([
    apiFetch(`/billing/orders?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=1`).then(r=>r.json()).catch(()=>({ total: 0 })),
    apiFetch(`/billing/customers?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=1`).then(r=>r.json()).catch(()=>({ total: 0 })),
    apiFetch(`/billing/transactions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=1`).then(r=>r.json()).catch(()=>({ total: 0 })),
  ])
  return { orders: o.total||0, customers: c.total||0, transactions: t.total||0 }
}

export default async function BillingReports(){
  const { orders, customers, transactions } = await countsToday()
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Reports</h1>
      <p className="text-sm text-muted-foreground">Billing → Reports</p>
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="border rounded p-4">
          <div className="text-sm text-muted-foreground">Today's Orders</div>
          <div className="text-2xl font-semibold">{orders}</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-muted-foreground">Today's Customers</div>
          <div className="text-2xl font-semibold">{customers}</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-muted-foreground">Today's Transactions</div>
          <div className="text-2xl font-semibold">{transactions}</div>
        </div>
      </div>
    </div>
  )
}
