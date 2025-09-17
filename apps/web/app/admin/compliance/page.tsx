'use client'
import { useState } from 'react'
import { useLocalStorage } from '../useLocalStorage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { DataTable, CommonColumn } from '@/components/ui/data-table'
export default function Compliance(){
  const [apiBase] = useLocalStorage<string>('apiBase', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001');
  const [orgId] = useLocalStorage<string>('orgId','');
  const [roles] = useLocalStorage<string>('roles','org');
  const [nodeType,setNodeType] = useState('document'); const [nodeId,setNodeId] = useState('');
  const [series,setSeries] = useState<any[]>([]);
  async function load(){ const res = await fetch(`${apiBase}/compliance/redactions?nodeType=${encodeURIComponent(nodeType)}&nodeId=${encodeURIComponent(nodeId)}`, { headers: { 'x-org-id': orgId, 'x-roles': roles } }); const data = await res.json(); setSeries(data.series||[]); }
  function csv(){ window.location.href = `${apiBase}/compliance/redactions/export.csv?nodeType=${encodeURIComponent(nodeType)}&nodeId=${encodeURIComponent(nodeId)}`; }
  const columns: CommonColumn<any>[] = [
    { accessorKey: 'day', header: 'Day', cell: ({ row }) => String(row.original.day).slice(0,10) },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email || 0 },
    { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => row.original.phone || 0 },
    { accessorKey: 'ssn', header: 'SSN', cell: ({ row }) => row.original.ssn || 0 },
    { accessorKey: 'cc', header: 'CC', cell: ({ row }) => row.original.cc || 0 },
  ]
  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Compliance & Redactions</h1></div>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3 items-end'>
            <label className='text-sm'>Node Type<Input value={nodeType} onChange={e=>setNodeType((e.target as HTMLInputElement).value)} /></label>
            <label className='text-sm'>Node ID<Input value={nodeId} onChange={e=>setNodeId((e.target as HTMLInputElement).value)} /></label>
            <div className='flex gap-2'><Button onClick={load}>Load</Button><Button variant='outline' onClick={csv}>Export CSV</Button></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Results</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <DataTable data={series} columns={columns} />
        </CardContent>
      </Card>
    </main>
  )
}
