"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function RolePermsForm({ roleId, perms, assigned, onSaved }: { roleId: string; perms: Array<{ id: string; key: string }>; assigned: Set<string>; onSaved?: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(assigned))
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  function toggle(key: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n })
  }
  async function onSave() {
    setErr(null); setLoading(true)
    const keys = Array.from(selected)
    const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: `/roles/${encodeURIComponent(roleId)}/permissions`, method: 'POST', body: { keys } }) })
    if (!r.ok) { try { const d=await r.json(); setErr(d?.error||d?.message||'Save failed') } catch { setErr('Save failed') } setLoading(false); return }
    setLoading(false); onSaved?.()
  }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {perms.map((p:any)=> (
          <label key={p.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.has(p.key)} onChange={()=>toggle(p.key)} />
            {p.key}
          </label>
        ))}
      </div>
      <Button type="button" onClick={onSave} disabled={loading}>Save Permissions</Button>
      {err && <div className="text-sm text-red-600" role="alert">{err}</div>}
    </div>
  )
}

