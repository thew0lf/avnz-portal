"use client"
import { DataTable, CommonColumn } from '@/components/ui/data-table'

export default function PricingTable({ rows }: { rows: any[] }) {
  const columns: CommonColumn<any>[] = [
    { accessorKey: 'scope', header: 'Scope', cell: ({ row }) => row.original.scope },
    { accessorKey: 'org_id', header: 'Org', cell: ({ row }) => row.original.org_id || '' },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => row.original.role || '' },
    { accessorKey: 'user_id', header: 'User', cell: ({ row }) => row.original.user_id || '' },
    { accessorKey: 'provider', header: 'Provider', cell: ({ row }) => row.original.provider },
    { accessorKey: 'model', header: 'Model', cell: ({ row }) => row.original.model },
    { accessorKey: 'metric', header: 'Metric', cell: ({ row }) => row.original.metric },
    { accessorKey: 'price_per_1k', header: '$/1k', cell: ({ row }) => Number(row.original.price_per_1k).toFixed(3) },
    { accessorKey: 'active', header: 'Active', cell: ({ row }) => String(row.original.active) },
  ]
  return <DataTable data={rows} columns={columns} />
}

