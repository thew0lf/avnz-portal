import { apiFetch } from '@/lib/api'
import TransactionsTable from './TransactionsTable'

async function loadToday(){
  const now = new Date(); const start = new Date(now); start.setHours(0,0,0,0)
  const qs = new URLSearchParams()
  qs.set('from', start.toISOString())
  qs.set('to', new Date(now.getTime()+1).toISOString())
  const r = await apiFetch(`/billing/transactions?${qs.toString()}`)
  if (!r.ok) return { rows: [] as any[], total: 0 }
  return r.json()
}

export default async function BillingTransactions(){
  const data = await loadToday()
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Transactions</h1>
      <p className="text-sm text-muted-foreground">Billing → Transactions (Today)</p>
      <div className="mt-4">
        <div className="text-sm text-muted-foreground mb-2">{data.total ?? 0} transactions found</div>
        {(!data.rows || data.rows.length===0) ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <TransactionsTable rows={data.rows} />
        )}
      </div>
    </div>
  )
}
