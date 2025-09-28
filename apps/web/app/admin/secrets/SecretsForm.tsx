"use client"
import * as React from 'react'
import { useToast } from '@/components/ui/toast-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SearchableRSelect from '@/components/ui/searchable-rselect'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ActionButton } from '@/components/admin/ActionButton'

export default function SecretsForm({ clients, configs, nodeId }: any){
  const { success, error } = useToast()
  const groups = React.useMemo(()=>{
    const g: Record<string, any[]> = {}
    for (const c of clients||[]) { const k = String(c.name||'').charAt(0).toUpperCase() || '#'; (g[k] ||= []).push(c) }
    return Object.entries(g).sort(([a],[b])=>a.localeCompare(b))
  },[clients])
  const [clientId, setClientId] = React.useState('')
  async function onSubmit(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body:any = { service: String(fd.get('service')||''), name: String(fd.get('name')||''), value: String(fd.get('value')||''), client_id: String(fd.get('client_id')||'')||undefined }
    const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/admin/services/configs?nodeId='+encodeURIComponent(nodeId), method:'POST', body }) })
    if (r.ok) success('Saved'); else error('We couldn’t save this secret. Please try again.')
  }
  return (
    <div className="space-y-4">
      <form method="post" onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <div><label className="block text-sm text-muted-foreground">Service</label><Input name="service" placeholder="sendgrid|twilio|aws" required /></div>
        <div><label className="block text-sm text-muted-foreground">Name</label><Input name="name" placeholder="api_key|from|account_sid" required /></div>
        <div>
          <label className="block text-sm text-muted-foreground">Client (optional)</label>
          <input type="hidden" name="client_id" value={clientId} />
          <SearchableRSelect
            value={clientId}
            onValueChange={setClientId}
            placeholder="Org default"
            items={[{value:'',label:'Org default'}, ...clients.map((c:any)=>({ value:c.id, label:c.name }))]}
          />
        </div>
        <div><label className="block text-sm text-muted-foreground">Value</label><Input name="value" type="password" required /></div>
        <div className="md:col-span-4"><Button type="submit">Save Secret</Button></div>
      </form>
      <div className="overflow-x-auto hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((c:any)=>(
              <TableRow key={c.id}>
                <TableCell className="flex items-center gap-2">{c.service} {c.deleted_at ? <span className="text-xs rounded bg-red-100 text-red-700 px-2 py-0.5">Deleted</span> : null}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.client_id || 'Org default'}</TableCell>
                <TableCell>{new Date(c.updated_at).toLocaleString('en-US',{ timeZone:'UTC' })}</TableCell>
                <TableCell>
                  {c.deleted_at ? (
                    <ActionButton variant="secondary" label="Restore" method="POST" path={`/admin/services/configs/${encodeURIComponent(c.id)}/restore`} />
                  ) : (
                    <ActionButton variant="secondary" label="Delete" method="DELETE" path={`/admin/services/configs/${encodeURIComponent(c.id)}`} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="md:hidden grid gap-2">
        {configs.map((c:any)=>(
          <div key={c.id} className="rounded border bg-white p-3">
            <div className="text-sm font-medium flex items-center gap-2">{c.service} · {c.name} {c.deleted_at ? <span className="text-xs rounded bg-red-100 text-red-700 px-2 py-0.5">Deleted</span> : null}</div>
            <div className="text-xs text-muted-foreground">Client: {c.client_id || 'Org default'}</div>
            <div className="text-xs">Updated: {new Date(c.updated_at).toLocaleString('en-US',{ timeZone:'UTC' })}</div>
            <div className="mt-2">
              {c.deleted_at ? (
                <ActionButton variant="secondary" label="Restore" method="POST" path={`/admin/services/configs/${encodeURIComponent(c.id)}/restore`} />
              ) : (
                <ActionButton variant="secondary" label="Delete" method="DELETE" path={`/admin/services/configs/${encodeURIComponent(c.id)}`} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
