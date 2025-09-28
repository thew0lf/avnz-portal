"use client"
import { DataTable, CommonColumn, makeActionsColumn } from '@/components/ui/data-table'

function fmt(ts?: string){ if(!ts) return '—'; try{ return new Date(ts).toLocaleString() }catch{ return '—' } }

export default function RpsOrdersTable({ rows }: { rows: any[] }){
  const columns: CommonColumn<any>[] = [
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => fmt(row.original.created_at) },
    { accessorKey: 'order_number', header: 'Order #', cell: ({ row }) => <a className="underline hover:no-underline" href={`/admin/dashboard/rps/orders/${row.original.id}`}>{row.original.order_number || '—'}</a> },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email || '—' },
    { accessorKey: 'state', header: 'State', cell: ({ row }) => row.original.state || '—' },
    { accessorKey: 'total_amount', header: 'Total', cell: ({ row }) => row.original.total_amount!=null? `${row.original.currency||'USD'} ${Number(row.original.total_amount).toFixed(2)}` : '—' },
    makeActionsColumn({ viewHref: (r:any) => `/admin/dashboard/rps/orders/${(r as any).id}` }),
  ]
  return <DataTable data={rows} columns={columns} />
}

