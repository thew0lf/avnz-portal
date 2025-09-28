"use client"
import { DataTable, CommonColumn, makeActionsColumn, makeSelectionColumn, makeDragColumn } from '@/components/ui/data-table'

export default function OrdersTable({ rows }: { rows: any[] }){
  const columns: CommonColumn<any>[] = [
    makeSelectionColumn(),
    makeDragColumn(),
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => new Date(row.original.created_at).toLocaleString() },
    { accessorKey: 'order_number', header: 'Order #', cell: ({ row }) => <a className="underline hover:no-underline" href={`/admin/dashboard/billing/orders/${row.original.id}`}>{row.original.order_number || '—'}</a> },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email || '—' },
    { accessorKey: 'state', header: 'State', cell: ({ row }) => row.original.state || '—' },
    { accessorKey: 'total_amount', header: 'Total', cell: ({ row }) => row.original.total_amount!=null? `${row.original.currency||'USD'} ${Number(row.original.total_amount).toFixed(2)}` : '—' },
    makeActionsColumn({ viewHref: (r:any) => `/admin/dashboard/billing/orders/${(r as any).id}` }),
  ]
  return <DataTable data={rows} columns={columns} enableDnD />
}
