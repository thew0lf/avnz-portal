import { headers } from 'next/headers'

async function load(id: string){
  const h = headers()
  const host = h.get('host') || 'localhost:3000'
  const proto = h.get('x-forwarded-proto') || 'http'
  const base = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`
  const r = await fetch(`${base}/api/agents/jobs/${id}`, { cache: 'no-store' })
  return r.json().catch(()=>null)
}

export default async function TaskDetail({ params }: { params: { id: string } }){
  const data = await load(params.id)
  if (!data) return (<div className="p-6"><h1 className="text-xl font-semibold">Task</h1><p className="text-sm text-muted-foreground">Not found</p></div>)
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Task {data.id}</h1>
        <p className="text-sm text-muted-foreground">Status: {data.status}</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="border rounded p-3 md:col-span-1">
          <div className="text-sm text-muted-foreground">Created</div>
          <div>{data.created_at? new Date(data.created_at*1000).toLocaleString() : '—'}</div>
          <div className="text-sm text-muted-foreground mt-2">Started</div>
          <div>{data.started_at? new Date(data.started_at*1000).toLocaleString() : '—'}</div>
          <div className="text-sm text-muted-foreground mt-2">Finished</div>
          <div>{data.finished_at? new Date(data.finished_at*1000).toLocaleString() : '—'}</div>
        </div>
        <div className="border rounded p-3 md:col-span-2">
          <div className="text-sm text-muted-foreground">Task</div>
          <pre className="whitespace-pre-wrap text-sm">{data.task||''}</pre>
        </div>
      </div>
      <div className="border rounded p-3">
        <div className="text-sm text-muted-foreground">Result</div>
        <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(data.result || data.error || {}, null, 2)}</pre>
      </div>
    </div>
  )
}
