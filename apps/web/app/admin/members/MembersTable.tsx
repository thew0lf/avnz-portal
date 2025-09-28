"use client"
import { DataTable, CommonColumn } from '@/components/ui/data-table'
import SetMemberRoleForm from '@/components/admin/forms/SetMemberRoleForm'

export default function MembersTable({ rows, roles }: { rows: any[]; roles: any[] }) {
  const columns: CommonColumn<any>[] = [
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email },
    { accessorKey: 'username', header: 'Username', cell: ({ row }) => row.original.username || '' },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => row.original.role },
    { accessorKey: 'created_at', header: 'Since', cell: ({ row }) => new Date(row.original.created_at).toLocaleString('en-US', { timeZone:'UTC' }) },
    { id: 'set_role', header: 'Set Role', enableSorting: false, cell: ({ row }) => (<SetMemberRoleForm identifier={row.original.email} roles={roles} />) },
  ]
  return <DataTable data={rows} columns={columns} />
}
