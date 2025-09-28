import { headers } from 'next/headers'
import TasksBoard from './TasksBoard'
import TokensChart from './TokensChart'
import TaskComposer from '@/components/admin/TaskComposer'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

async function load(limit = 50){
  // Use absolute URL based on current request headers (server component)
  const h = headers()
  const host = h.get('host') || 'localhost:3000'
  const proto = h.get('x-forwarded-proto') || 'http'
  const base = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`
  const r = await fetch(`${base}/api/agents/jobs?limit=${limit}`, { cache: 'no-store' })
  const j = await r.json().catch(()=>({ rows: [] }))
  return j.rows || []
}


export default async function TasksDashboard(){
  const rows = await load(100)
  const byStatus: Record<string, number> = {}
  for (const r of rows) { byStatus[String(r.status||'unknown')] = (byStatus[String(r.status||'unknown')]||0)+1 }
  let inTok = 0, outTok = 0
  for (const r of rows) {
    const u = (r.result && r.result.usage) || {}
    inTok += Number(u.input_tokens||0)
    outTok += Number(u.output_tokens||0)
  }
  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Tasks</h1></div>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Summary</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid md:grid-cols-4 gap-4">
            {Object.entries(byStatus).map(([k,v])=> (
              <div key={k} className="border rounded p-4"><div className="text-sm text-muted-foreground capitalize">{k}</div><div className="text-2xl font-semibold">{v}</div></div>
            ))}
            <div className="border rounded p-4"><div className="text-sm text-muted-foreground">Input tokens (sum)</div><div className="text-2xl font-semibold">{inTok}</div></div>
            <div className="border rounded p-4"><div className="text-sm text-muted-foreground">Output tokens (sum)</div><div className="text-2xl font-semibold">{outTok}</div></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Queue task</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="max-w-xl"><TaskComposer /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Tasks</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <TasksBoard rows={rows} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Tokens (grouped by day)</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <TokensChart rows={rows} />
        </CardContent>
      </Card>
    </main>
  )
}
