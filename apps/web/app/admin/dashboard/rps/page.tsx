export default function RpsLanding(){
  return (
    <div className="p-6 space-y-2">
      <h1 className="text-xl font-semibold">RPS (FastAPI)</h1>
      <p className="text-sm text-muted-foreground">Experimental views powered by the AI service FastAPI routers.</p>
      <ul className="list-disc pl-5 text-sm">
        <li><a className="underline hover:no-underline" href="/admin/dashboard/rps/orders">Orders</a></li>
        <li><a className="underline hover:no-underline" href="/admin/dashboard/rps/customers">Customers</a></li>
        <li><a className="underline hover:no-underline" href="/admin/dashboard/rps/transactions">Transactions</a></li>
      </ul>
    </div>
  )
}

