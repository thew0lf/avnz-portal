"use client"
import { DataTable, CommonColumn, makeActionsColumn, makeDragColumn, makeSelectionColumn } from '@/components/ui/data-table'

export default function ClientsTable({ rows }: { rows: any[] }) {
  const columns: CommonColumn<any>[] = [
    makeSelectionColumn(),
    makeDragColumn(),
    { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => row.original.name },
    { accessorKey: 'manager_email', header: 'Manager', cell: ({ row }) => row.original.manager_email || '-' },
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => new Date(row.original.created_at).toLocaleString('en-US', { timeZone: 'UTC' }) },
    makeActionsColumn({ viewHref: () => '/admin/clients/manage' }),
  ]
  return <DataTable data={rows} columns={columns} enableDnD />
}

