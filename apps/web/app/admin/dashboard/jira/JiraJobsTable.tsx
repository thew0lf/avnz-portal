"use client"
import { DataTable, CommonColumn } from '@/components/ui/data-table'

function fmt(ts?: string){ if(!ts) return '—'; try{ return new Date(ts).toLocaleString() }catch{ return '—' } }

export default function JiraJobsTable({ rows }: { rows: any[] }){
  const cols: CommonColumn<any>[] = [
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => fmt(row.original.created_at) },
    { accessorKey: 'finished_at', header: 'Finished', cell: ({ row }) => fmt(row.original.finished_at) },
    { accessorKey: 'issue_key', header: 'Issue', cell: ({ row }) => <span className="font-mono text-xs">{row.original.issue_key}</span> },
    { accessorKey: 'phase', header: 'Phase', cell: ({ row }) => row.original.phase || '—' },
    { accessorKey: 'assigned_to', header: 'Assigned', cell: ({ row }) => row.original.assigned_to || '—' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => row.original.status || '—' },
    { accessorKey: 'id', header: 'Job', cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span> },
  ]
  return <DataTable data={rows||[]} columns={cols} />
}

