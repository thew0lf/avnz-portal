import { apiFetch } from '@/lib/api'

async function load(id: string){
  const r = await apiFetch(`/billing/orders/${id}`)
  if (!r.ok) return null
  return r.json()
}

export default async function OrderDetail({ params }: { params: { id: string } }){
  const { id } = params
  const data = await load(id)
  if (!data) return (<div className="p-6"><h1 className="text-xl font-semibold">Order</h1><p className="text-sm text-muted-foreground">Not found</p></div>)
  const o = data.order
  return (
    <div className="p-6 grid gap-4">
      <div>
        <h1 className="text-xl font-semibold">Order {o.order_number || o.id}</h1>
        <p className="text-sm text-muted-foreground">Created {new Date(o.created_at).toLocaleString()}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <h2 className="font-medium mb-2">Summary</h2>
          <div className="text-sm grid gap-1">
            <div><span className="text-muted-foreground">State:</span> {o.state || '—'}</div>
            <div><span className="text-muted-foreground">Email:</span> {o.email || '—'}</div>
            <div><span className="text-muted-foreground">Total:</span> {o.total_amount!=null? `${o.currency||'USD'} ${Number(o.total_amount).toFixed(2)}` : '—'}</div>
          </div>
        </div>
        <div className="border rounded p-3">
          <h2 className="font-medium mb-2">Customer</h2>
          {data.customer ? (
            <div className="text-sm grid gap-1">
              <div>{data.customer.first_name || ''} {data.customer.last_name || ''}</div>
              <div className="text-muted-foreground">{data.customer.email || '—'}</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No customer record</div>
          )}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <h2 className="font-medium mb-2">Billing Address</h2>
          {data.billingAddress ? (
            <div className="text-sm whitespace-pre-line">{[data.billingAddress.name, data.billingAddress.line1, data.billingAddress.line2, `${data.billingAddress.city||''} ${data.billingAddress.region||''} ${data.billingAddress.postal_code||''}`, data.billingAddress.country].filter(Boolean).join('\n')}</div>
          ) : (<div className="text-sm text-muted-foreground">—</div>)}
        </div>
        <div className="border rounded p-3">
          <h2 className="font-medium mb-2">Shipping Address</h2>
          {data.shippingAddress ? (
            <div className="text-sm whitespace-pre-line">{[data.shippingAddress.name, data.shippingAddress.line1, data.shippingAddress.line2, `${data.shippingAddress.city||''} ${data.shippingAddress.region||''} ${data.shippingAddress.postal_code||''}`, data.shippingAddress.country].filter(Boolean).join('\n')}</div>
          ) : (<div className="text-sm text-muted-foreground">—</div>)}
        </div>
      </div>
      <div className="border rounded p-3 overflow-x-auto">
        <h2 className="font-medium mb-2">Items</h2>
        {(!data.items || data.items.length===0) ? (
          <div className="text-sm text-muted-foreground">No items</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4 text-right">Qty</th>
                <th className="py-2 pr-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it:any)=>(
                <tr key={it.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{it.sku || '—'}</td>
                  <td className="py-2 pr-4">{it.name || '—'}</td>
                  <td className="py-2 pr-4 text-right">{Number(it.qty_ordered || 0)}</td>
                  <td className="py-2 pr-4 text-right">{it.amount!=null? `${o.currency||'USD'} ${Number(it.amount).toFixed(2)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded p-3 overflow-x-auto">
          <h2 className="font-medium mb-2">Transactions</h2>
          {(!data.transactions || data.transactions.length===0) ? (
            <div className="text-sm text-muted-foreground">No transactions</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Processor</th>
                  <th className="py-2 pr-4">State</th>
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t:any)=>(
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{t.processor || '—'}</td>
                    <td className="py-2 pr-4">{t.state || '—'}</td>
                    <td className="py-2 pr-4">{t.response_code || '—'}</td>
                    <td className="py-2 pr-4 text-right">{t.amount!=null? `${t.currency||o.currency||'USD'} ${Number(t.amount).toFixed(2)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="border rounded p-3 overflow-x-auto">
          <h2 className="font-medium mb-2">Tracking</h2>
          {(!data.tracking || data.tracking.length===0) ? (
            <div className="text-sm text-muted-foreground">No tracking numbers</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Code</th>
                </tr>
              </thead>
              <tbody>
                {data.tracking.map((t:any)=>(
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{t.kind || '—'}</td>
                    <td className="py-2 pr-4">{t.code || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

