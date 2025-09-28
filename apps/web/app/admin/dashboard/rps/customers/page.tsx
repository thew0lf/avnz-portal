import { absoluteUrl } from '@/lib/url'

async function loadToday() {
  const now = new Date(); const start = new Date(now); start.setHours(0,0,0,0)
  const qs = new URLSearchParams()
  qs.set('from', start.toISOString())
  qs.set('to', new Date(now.getTime()+1).toISOString())
  const r = await fetch(absoluteUrl(`/api/rps/customers?${qs.toString()}`), { cache: 'no-store' })
  if (!r.ok) return { rows: [] as any[], total: 0 }
  return r.json()
}

export default async function CustomersPage(){
  const data = await loadToday()
  const csvUrl = `/api/rps/customers?format=csv`
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Customers (RPS)</h1>
          <p className="text-sm text-muted-foreground">FastAPI → RPS Customers (Today)</p>
        </div>
        <a href={csvUrl} className="text-sm underline hover:no-underline">Download CSV</a>
      </div>
      <div className="mt-4">
        <div className="text-sm text-muted-foreground mb-2">{data.total ?? 0} customers found</div>
        {(!data.rows || data.rows.length===0) ? (
          <p className="text-sm text-muted-foreground">No customers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r:any)=> (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                    <td className="py-2 pr-4">{[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td className="py-2 pr-4">{r.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
