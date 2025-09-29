"use client"
import { DataTable, CommonColumn } from '@/components/ui/data-table'
import { ActionButton } from '@/components/admin/ActionButton'

function fmt(ts?: string){ if(!ts) return '—'; try{ return new Date(ts).toLocaleString() }catch{ return '—' } }

export default function JiraStaleTable({ rows }: { rows: any[] }){
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
  return <DataTable data={rows||[]} columns={cols} />
}
