'use client'
import { useEffect, useState } from 'react'
import { useLocalStorage } from '../useLocalStorage'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'

export default function Usage(){
  const [apiBase] = useLocalStorage<string>('apiBase', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001')
  const [orgId] = useLocalStorage<string>('orgId','')
  const [roles] = useLocalStorage<string>('roles','org')
  const [rows,setRows] = useState<any[]>([])
  useEffect(()=>{ (async()=>{ const res=await fetch(`${apiBase}/usage/summary`,{headers:{'x-org-id':orgId,'x-roles':roles}}); const data=await res.json(); setRows(data.rows||[]); })(); },[apiBase,orgId,roles])
  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Usage</h1></div>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Summary</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <tr className="text-left"><TableHead>Provider</TableHead><TableHead>Model</TableHead><TableHead>Operation</TableHead><TableHead>Input</TableHead><TableHead>Output</TableHead><TableHead>Embed</TableHead><TableHead>Cost</TableHead></tr>
              </TableHeader>
              <TableBody>
                {rows.map((r,i)=>(
                  <TableRow key={i}>
                    <TableCell>{r.provider}</TableCell>
                    <TableCell>{r.model}</TableCell>
                    <TableCell>{r.operation}</TableCell>
                    <TableCell>{r.in_tokens}</TableCell>
                    <TableCell>{r.out_tokens}</TableCell>
                    <TableCell>{r.embed_tokens}</TableCell>
                    <TableCell>${'{'}r.cost_usd{'}'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
