"use client"
import { DataTable, CommonColumn } from '@/components/ui/data-table'

export default function ProjectMembersTable({ rows }: { rows: any[] }) {
  const columns: CommonColumn<any>[] = [
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email },
    { accessorKey: 'username', header: 'Username', cell: ({ row }) => row.original.username || '' },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => row.original.role },
    { accessorKey: 'created_at', header: 'Since', cell: ({ row }) => new Date(row.original.created_at).toLocaleString('en-US', { timeZone:'UTC' }) },
  ]
  return <DataTable data={rows} columns={columns} />
}

