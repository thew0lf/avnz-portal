import { DataTable, CommonColumn } from '@/components/ui/data-table'
import { ActionButton } from '@/components/admin/ActionButton'

export default function InvitesTable({ rows }: { rows: any[] }) {
  const columns: CommonColumn<any>[] = [
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => row.original.role || '-' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (row.original.revoked? 'revoked' : row.original.used_at? 'used' : 'pending') },
    { accessorKey: 'expires_at', header: 'Expires', cell: ({ row }) => (row.original.expires_at ? new Date(row.original.expires_at).toLocaleString('en-US', { timeZone:'UTC' }) : '-') },
    {
      id: 'actions', header: 'Actions', enableSorting: false,
      cell: ({ row }) => (!row.original.revoked && !row.original.used_at) ? (
        <ActionButton label="Revoke" variant="secondary" method="POST" path={`/clients/invites/${row.original.id}/revoke`} onDone={()=>{}} />
      ) : null
    },
  ]
  return <DataTable data={rows} columns={columns} />
}