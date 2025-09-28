"use client"
import { DataTable, CommonColumn, makeSelectionColumn, makeDragColumn } from '@/components/ui/data-table'

export default function TransactionsTable({ rows }: { rows: any[] }){
  const columns: CommonColumn<any>[] = [
    makeSelectionColumn(),
    makeDragColumn(),
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => new Date(row.original.created_at).toLocaleString() },
    { accessorKey: 'order_id', header: 'Order', cell: ({ row }) => row.original.order_id || '—' },
    { accessorKey: 'processor', header: 'Processor', cell: ({ row }) => row.original.processor || '—' },
    { accessorKey: 'state', header: 'State', cell: ({ row }) => row.original.state || '—' },
    { accessorKey: 'response_code', header: 'Code', cell: ({ row }) => row.original.response_code || '—' },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => row.original.amount!=null? `${row.original.currency||'USD'} ${Number(row.original.amount).toFixed(2)}` : '—' },
  ]
  return <DataTable data={rows} columns={columns} enableDnD />
}
