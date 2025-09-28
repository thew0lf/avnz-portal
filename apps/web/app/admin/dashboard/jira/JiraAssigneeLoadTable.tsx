"use client"
import { DataTable, CommonColumn } from '@/components/ui/data-table'

export default function JiraAssigneeLoadTable({ rows }: { rows: any[] }){
  const cols: CommonColumn<any>[] = [
    { accessorKey: 'name', header: 'User', cell: ({ row }) => row.original.name },
    { accessorKey: 'open', header: 'Open Issues', cell: ({ row }) => (row.original.open ?? '—') },
    { accessorKey: 'phases', header: 'Phases', cell: ({ row }) => (Array.isArray(row.original.phases) ? row.original.phases.join(', ') : '—') },
  ]
  return <DataTable data={rows||[]} columns={cols} />
}

