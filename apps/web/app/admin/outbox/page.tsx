import { cookies } from 'next/headers'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { DataTable, CommonColumn } from '@/components/ui/data-table'
import Link from 'next/link'
import { ActionButton } from '@/components/admin/ActionButton'

export default async function OutboxPage({ searchParams }: { searchParams?: { [k: string]: string | string[] | undefined } }){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  const nodeId = (session as any)?.orgUUID || (session as any)?.orgId || ''
  const status = String(searchParams?.status || '')
  const q = String(searchParams?.q || '')
  const limit = Number(searchParams?.limit || 50)
  const offset = Number(searchParams?.offset || 0)
  const res = await apiFetch(`/admin/outbox?nodeId=${encodeURIComponent(nodeId)}&status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)
  const data = await res.json().catch(()=>({ rows: [] }))
  const rows = data.rows || []
  const columns: CommonColumn<any>[] = [
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => new Date(row.original.created_at).toLocaleString() },
    { accessorKey: 'to_email', header: 'To', cell: ({ row }) => row.original.to_email },
    { accessorKey: 'type', header: 'Type', cell: ({ row }) => row.original.type },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => row.original.status },
    { accessorKey: 'attempts', header: 'Attempts', cell: ({ row }) => row.original.attempts },
    { accessorKey: 'last_error', header: 'Error', cell: ({ row }) => (row.original.last_error||'').slice(0,60) },
    { id: 'action', header: 'Action', cell: ({ row }) => (row.original.status !== 'sent') ? (<ActionButton label="Retry" path={`/admin/outbox/${encodeURIComponent(row.original.id)}/retry`} method="POST" />) : null },
  ]
  return (
    <main className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Outbox</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <form method="get" className="flex items-center gap-2">
              <input className="border rounded px-2 py-1" name="q" placeholder="Search email" defaultValue={q} />
              <select className="border rounded px-2 py-1" name="status" defaultValue={status}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
              <button className="border rounded px-3 py-1" type="submit">Filter</button>
            </form>
          </div>
          <DataTable data={rows} columns={columns} />
        </CardContent>
      </Card>
    </main>
  )
}
