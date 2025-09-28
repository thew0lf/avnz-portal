import RpsOrdersTable from './RpsOrdersTable'
import { absoluteUrl } from '@/lib/url'

async function loadToday() {
  const now = new Date(); const start = new Date(now); start.setHours(0,0,0,0)
  const qs = new URLSearchParams()
  qs.set('from', start.toISOString())
  qs.set('to', new Date(now.getTime()+1).toISOString())
  const r = await fetch(absoluteUrl(`/api/rps/orders?${qs.toString()}`), { cache: 'no-store' })
  if (!r.ok) return { rows: [] as any[], total: 0 }
  return r.json()
}

export default async function OrdersPage(){
  const data = await loadToday()
  const csvUrl = `/api/rps/orders?format=csv`
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Orders (RPS)</h1>
          <p className="text-sm text-muted-foreground">FastAPI → RPS Orders (Today)</p>
        </div>
        <a href={csvUrl} className="text-sm underline hover:no-underline">Download CSV</a>
      </div>
      <div className="mt-4">
        <div className="text-sm text-muted-foreground mb-2">{data.total ?? 0} orders found</div>
        {(!data.rows || data.rows.length===0) ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <RpsOrdersTable rows={data.rows} />
        )}
      </div>
    </div>
  )
}
