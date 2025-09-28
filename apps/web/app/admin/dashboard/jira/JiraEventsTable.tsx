"use client"
import { DataTable, CommonColumn } from '@/components/ui/data-table'

function fmt(ts?: string){ if(!ts) return '—'; try{ return new Date(ts).toLocaleString() }catch{ return '—' } }

export default function JiraEventsTable({ rows }: { rows: any[] }){
  const cols: CommonColumn<any>[] = [
    { accessorKey: 'created_at', header: 'When', cell: ({ row }) => fmt(row.original.created_at) },
    { accessorKey: 'issue_key', header: 'Issue', cell: ({ row }) => <span className="font-mono text-xs">{row.original.issue_key||'—'}</span> },
    { accessorKey: 'event_type', header: 'Event', cell: ({ row }) => row.original.event_type },
  ]
  return <DataTable data={rows||[]} columns={cols} />
}

