"use client"
import { DataTable, CommonColumn } from '@/components/ui/data-table'
import { ActionButton } from '@/components/admin/ActionButton'

export default function OutboxTable({ rows }: { rows: any[] }) {
  const columns: CommonColumn<any>[] = [
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => new Date(row.original.created_at).toLocaleString() },
    { accessorKey: 'to_email', header: 'To', cell: ({ row }) => row.original.to_email },
    { accessorKey: 'type', header: 'Type', cell: ({ row }) => row.original.type },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => row.original.status },
    { accessorKey: 'attempts', header: 'Attempts', cell: ({ row }) => row.original.attempts },
    { accessorKey: 'last_error', header: 'Error', cell: ({ row }) => (row.original.last_error||'').slice(0,60) },
    { id: 'action', header: 'Action', enableSorting: false, cell: ({ row }) => (row.original.status !== 'sent') ? (<ActionButton label="Retry" path={`/admin/outbox/${encodeURIComponent(row.original.id)}/retry`} method="POST" />) : null },
  ]
  return <DataTable data={rows} columns={columns} />
}
