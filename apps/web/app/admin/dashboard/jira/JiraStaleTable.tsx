"use client"
import { DataTable, CommonColumn } from '@/components/ui/data-table'
import { ActionButton } from '@/components/admin/ActionButton'

function fmt(ts?: string){ if(!ts) return '—'; try{ return new Date(ts).toLocaleString() }catch{ return '—' } }

export default function JiraStaleTable({ rows }: { rows: any[] }){
  const [q, setQ] = React.useState('')
  const [assignee, setAssignee] = React.useState('')
  const [status, setStatus] = React.useState('')
  const list = React.useMemo(()=>{
    return (rows||[]).filter((r:any)=>{
      const okQ = !q || (String(r.key||'').toLowerCase().includes(q.toLowerCase()) || String(r.summary||'').toLowerCase().includes(q.toLowerCase()))
      const okA = !assignee || String(r.assignee||'').toLowerCase().includes(assignee.toLowerCase())
      const okS = !status || String(r.status||'').toLowerCase() === status.toLowerCase()
      return okQ && okA && okS
    })
  }, [rows, q, assignee, status])
  const cols: CommonColumn<any>[] = [
    { accessorKey: 'key', header: 'Issue', cell: ({ row }) => <span className="font-mono text-xs">{row.original.key}</span> },
    { accessorKey: 'assignee', header: 'Assigned', cell: ({ row }) => row.original.assignee || '—' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => row.original.status || '—' },
    { accessorKey: 'updated', header: 'Updated', cell: ({ row }) => fmt(row.original.updated) },
    { accessorKey: 'summary', header: 'Summary', cell: ({ row }) => row.original.summary || '—' },
    { id: 'action', header: 'Action', cell: ({ row }) => (
      <ActionButton label="Requeue" path={`/jira/requeue/${encodeURIComponent(row.original.key)}`} />
    )},
  ]
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-muted-foreground">Search</label>
          <input value={q} onChange={(e)=> setQ(e.target.value)} className="border rounded px-2 py-1 w-48" placeholder="key or summary" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Assignee</label>
          <input value={assignee} onChange={(e)=> setAssignee(e.target.value)} className="border rounded px-2 py-1 w-40" placeholder="name" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Status</label>
          <input value={status} onChange={(e)=> setStatus(e.target.value)} className="border rounded px-2 py-1 w-36" placeholder="e.g., In Progress" />
        </div>
      </div>
      <DataTable data={list} columns={cols} />
    </div>
  )
}
