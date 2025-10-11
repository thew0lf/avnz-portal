"use client"
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast-provider'

export default function ForceStartDialog({ defaultKeys, minutes }: { defaultKeys?: string[]; minutes?: number }){
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const { success, error } = useToast()

  function parseKeys(input: string): string[] {
    const parts = String(input||'').split(/[\s,;\n]+/).map(s=>s.trim()).filter(Boolean)
    // Basic filter to keep JIRA keys like ABC-123
    return parts.filter(p => /[A-Z][A-Z0-9]+-\d+/.test(p))
  }

  async function onSubmit(){
    const keys = parseKeys(value)
    if (keys.length === 0) { error('Enter at least one valid Jira key'); return }
    setLoading(true)
    try{
      const res = await fetch('/api/admin/proxy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: '/jira/force-start', method: 'POST', body: { keys } }),
      })
      if (!res.ok) {
        try { const j = await res.json(); error(j?.error || j?.message || 'Force Start failed') } catch { error('Force Start failed') }
      } else {
        success('Force Start queued')
        setOpen(false)
        setValue('')
      }
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary">Force Start</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Force Start Tickets</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">Enter one or more Jira keys (comma, space, or newline separated).</div>
          <Textarea value={value} onChange={e=>setValue(e.target.value)} placeholder="e.g., AVNZ-11, AVNZ-12, AVNZ-13" rows={4} />
          {Array.isArray(defaultKeys) && defaultKeys.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div>Stale issues{typeof minutes==='number' ? ` (≥ ${minutes}m)` : ''}: {defaultKeys.length}</div>
              <Button type="button" size="sm" variant="secondary" onClick={()=> setValue(defaultKeys.join(' '))}>Use Stale</Button>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={()=>setOpen(false)} disabled={loading}>Cancel</Button>
            <Button type="button" onClick={onSubmit} disabled={loading}>{loading ? 'Starting…' : 'Start'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
