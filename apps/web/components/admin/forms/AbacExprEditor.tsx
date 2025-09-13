"use client"
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

export default function AbacExprEditor({ id, defaultValue }: { id: string; defaultValue: string }){
  const [val, setVal] = useState(defaultValue)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { success, error: toastError } = useToast()
  async function onSave(){
    setErr(null); setLoading(true)
    let parsed: any
    try { parsed = JSON.parse(val) } catch { setErr('Invalid JSON'); setLoading(false); return }
    const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: `/admin/abac/${encodeURIComponent(id)}`, method: 'PATCH', body: { expr: parsed } }) })
    if (!r.ok) { try { const d=await r.json(); const msg = d?.error||d?.message||'Update failed'; setErr(msg); toastError(msg) } catch { setErr('Update failed'); toastError('Update failed') } }
    else { success('Fence updated') }
    setLoading(false)
  }
  return (
    <div className="flex gap-2 items-center">
      <Input value={val} onChange={(e)=>setVal((e.target as HTMLInputElement).value)} />
      <Button type="button" onClick={onSave} disabled={loading}>Update</Button>
      {err && <div className="text-sm text-red-600" role="alert">{err}</div>}
    </div>
  )
}
