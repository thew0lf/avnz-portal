"use client"
import { DataTable, CommonColumn, makeActionsColumn, makeDragColumn, makeSelectionColumn } from '@/components/ui/data-table'

export default function ProjectsTable({ rows }: { rows: any[] }) {
  const columns: CommonColumn<any>[] = [
    makeSelectionColumn(),
    makeDragColumn(),
    { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code || '' },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => row.original.name },
    { accessorKey: 'client_code', header: 'Client', cell: ({ row }) => row.original.client_code || '' },
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => new Date(row.original.created_at).toLocaleString('en-US', { timeZone: 'UTC' }) },
    makeActionsColumn({ viewHref: () => `/admin/projects` }),
  ]
  return <DataTable data={rows} columns={columns} enableDnD />
}

