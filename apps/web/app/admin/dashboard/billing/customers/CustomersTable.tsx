"use client"
import { DataTable, CommonColumn, makeSelectionColumn, makeDragColumn } from '@/components/ui/data-table'

export default function CustomersTable({ rows }: { rows: any[] }){
  const columns: CommonColumn<any>[] = [
    makeSelectionColumn(),
    makeDragColumn(),
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => new Date(row.original.created_at).toLocaleString() },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email || '—' },
    { accessorKey: 'first_name', header: 'First', cell: ({ row }) => row.original.first_name || '—' },
    { accessorKey: 'last_name', header: 'Last', cell: ({ row }) => row.original.last_name || '—' },
  ]
  return <DataTable data={rows} columns={columns} enableDnD />
}
