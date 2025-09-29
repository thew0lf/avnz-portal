"use client"
import React from 'react'
import { DataTable, CommonColumn } from '@/components/ui/data-table'

function fmt(ts?: string){ if(!ts) return '—'; try{ return new Date(ts).toLocaleString() }catch{ return '—' } }

export default function JiraJobsTable({ rows }: { rows: any[] }){
  const [phase, setPhase] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [assignee, setAssignee] = React.useState('')
  const [q, setQ] = React.useState('')
  const list = React.useMemo(()=>{
    return (rows||[]).filter((r:any)=>{
      const okP = !phase || String(r.phase||'').toLowerCase() === phase.toLowerCase()
      const okS = !status || String(r.status||'').toLowerCase() === status.toLowerCase()
      const okA = !assignee || String(r.assigned_to||'').toLowerCase().includes(assignee.toLowerCase())
      const okQ = !q || (String(r.issue_key||'').toLowerCase().includes(q.toLowerCase()) || String(r.task||'').toLowerCase().includes(q.toLowerCase()))
      return okP && okS && okA && okQ
    })
  }, [rows, phase, status, assignee, q])
  const cols: CommonColumn<any>[] = [
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => fmt(row.original.created_at) },
    { accessorKey: 'finished_at', header: 'Finished', cell: ({ row }) => fmt(row.original.finished_at) },
    { accessorKey: 'issue_key', header: 'Issue', cell: ({ row }) => <span className="font-mono text-xs">{row.original.issue_key}</span> },
    { accessorKey: 'phase', header: 'Phase', cell: ({ row }) => row.original.phase || '—' },
    { accessorKey: 'assigned_to', header: 'Assigned', cell: ({ row }) => row.original.assigned_to || '—' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => row.original.status || '—' },
    { accessorKey: 'id', header: 'Job', cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span> },
  ]
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-muted-foreground">Phase</label>
          <input value={phase} onChange={(e)=> setPhase(e.target.value)} className="border rounded px-2 py-1 w-28" placeholder="dev/review/qa" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Status</label>
          <input value={status} onChange={(e)=> setStatus(e.target.value)} className="border rounded px-2 py-1 w-28" placeholder="queued/done" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Assignee</label>
          <input value={assignee} onChange={(e)=> setAssignee(e.target.value)} className="border rounded px-2 py-1 w-40" placeholder="name" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Search</label>
          <input value={q} onChange={(e)=> setQ(e.target.value)} className="border rounded px-2 py-1 w-48" placeholder="issue or task" />
        </div>
      </div>
      <DataTable data={list} columns={cols} />
    </div>
  )
}
