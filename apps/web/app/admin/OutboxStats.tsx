import { cookies } from 'next/headers'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'

export default async function OutboxStats() {
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  const nodeId = (session as any)?.orgUUID || (session as any)?.orgId || ''
  const r = await apiFetch(`/admin/outbox/stats?nodeId=${encodeURIComponent(nodeId)}`)
  const data = await r.json().catch(()=>({ rows: [] }))
  const map: Record<string, number> = {}
  for (const row of (data.rows || [])) {
    map[row.status] = Number(row.cnt || 0)
  }
  return (
    <div className="p-3 border rounded-md">
      <div className="text-sm text-muted-foreground">Outbox</div>
      <div className="mt-1 grid grid-cols-3 gap-3 text-sm">
        <div><div className="text-muted-foreground">Pending</div><div className="font-medium">{(map['pending']||0).toLocaleString()}</div></div>
        <div><div className="text-muted-foreground">Processing</div><div className="font-medium">{(map['processing']||0).toLocaleString()}</div></div>
        <div><div className="text-muted-foreground">Failed</div><div className="font-medium">{(map['failed']||0).toLocaleString()}</div></div>
      </div>
      {data.sqs && (
        <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
          <div><div className="text-muted-foreground">SQS queued</div><div className="font-medium">{Number(data.sqs.messages||0).toLocaleString()}</div></div>
          <div><div className="text-muted-foreground">SQS in-flight</div><div className="font-medium">{Number(data.sqs.inFlight||0).toLocaleString()}</div></div>
          <div><div className="text-muted-foreground">SQS DLQ</div><div className="font-medium">{Number(data.sqs.dlqMessages||0).toLocaleString()}</div></div>
        </div>
      )}
      <div className="mt-2 text-xs"><a className="underline" href="/admin/outbox">View outbox</a></div>
    </div>
  )
}
