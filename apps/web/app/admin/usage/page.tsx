'use client'
import { useEffect, useState } from 'react'
import { useLocalStorage } from '../useLocalStorage'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { DataTable, CommonColumn } from '@/components/ui/data-table'

export default function Usage(){
  const [apiBase] = useLocalStorage<string>('apiBase', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001')
  const [orgId] = useLocalStorage<string>('orgId','')
  const [roles] = useLocalStorage<string>('roles','org')
  const [rows,setRows] = useState<any[]>([])
  useEffect(()=>{ (async()=>{ const res=await fetch(`${apiBase}/usage/summary`,{headers:{'x-org-id':orgId,'x-roles':roles}}); const data=await res.json(); setRows(data.rows||[]); })(); },[apiBase,orgId,roles])
  const columns: CommonColumn<any>[] = [
    { accessorKey: 'provider', header: 'Provider', cell: ({ row }) => row.original.provider },
    { accessorKey: 'model', header: 'Model', cell: ({ row }) => row.original.model },
    { accessorKey: 'operation', header: 'Operation', cell: ({ row }) => row.original.operation },
    { accessorKey: 'in_tokens', header: 'Input', cell: ({ row }) => row.original.in_tokens },
    { accessorKey: 'out_tokens', header: 'Output', cell: ({ row }) => row.original.out_tokens },
    { accessorKey: 'embed_tokens', header: 'Embed', cell: ({ row }) => row.original.embed_tokens },
    { accessorKey: 'cost_usd', header: 'Cost', cell: ({ row }) => `$${row.original.cost_usd}` },
  ]
  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Usage</h1></div>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Summary</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <DataTable data={rows} columns={columns} />
        </CardContent>
      </Card>
    </main>
  )
}
