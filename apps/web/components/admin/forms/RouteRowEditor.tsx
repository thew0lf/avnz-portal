"use client"
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function RouteRowEditor({ row }: { row: { id: string; method: string; path: string; domain: string; resource_type: string; action_name: string; resource_param?: string|null } }){
  const [domain, setDomain] = useState(row.domain)
  const [resource_type, setResourceType] = useState(row.resource_type)
  const [action_name, setActionName] = useState(row.action_name)
  const [resource_param, setResourceParam] = useState(row.resource_param || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function update(){
    setSaving(true); setErr(null)
    const body = { method: row.method, path: row.path, domain, resource_type, action_name, resource_param: resource_param || undefined }
    const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/admin/routes', method: 'POST', body }) })
    if (!r.ok) { try { const d=await r.json(); setErr(d?.error||d?.message||'Update failed') } catch { setErr('Update failed') } }
    setSaving(false)
  }
  async function del(){
    setSaving(true); setErr(null)
    const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: `/admin/routes/${encodeURIComponent(row.id)}`, method: 'DELETE' }) })
    if (!r.ok) { try { const d=await r.json(); setErr(d?.error||d?.message||'Delete failed') } catch { setErr('Delete failed') } }
    setSaving(false)
  }
  return (
    <>
      <td className="py-2 pr-4">
        <Input value={domain} onChange={(e)=>setDomain((e.target as HTMLInputElement).value)} className="w-28" />
      </td>
      <td className="py-2 pr-4">
        <Input value={resource_type} onChange={(e)=>setResourceType((e.target as HTMLInputElement).value)} className="w-28" />
      </td>
      <td className="py-2 pr-4">
        <Input value={action_name} onChange={(e)=>setActionName((e.target as HTMLInputElement).value)} className="w-28" />
      </td>
      <td className="py-2 pr-4">
        <Input value={resource_param} onChange={(e)=>setResourceParam((e.target as HTMLInputElement).value)} className="w-28" />
      </td>
      <td className="py-2 pr-4 flex gap-2">
        <Button type="button" onClick={update} disabled={saving}>Update</Button>
        <Button type="button" onClick={del} disabled={saving} variant="secondary">Delete</Button>
        {err && <div className="text-sm text-red-600" role="alert">{err}</div>}
      </td>
    </>
  )
}

