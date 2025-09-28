"use client"
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Row = { id?: string, name: string, value: string }
const PHASES = [
  { key: 'assignee_dev', label: 'Dev' },
  { key: 'assignee_review', label: 'Review' },
  { key: 'assignee_qa', label: 'QA' },
  { key: 'assignee_test', label: 'Test' },
  { key: 'assignee_audit', label: 'Audit' },
]

export default function JiraAssignees(){
  const [rows, setRows] = useState<Row[]>([])
  const [open, setOpen] = useState<string|undefined>(undefined)
  const [val, setVal] = useState('')
  const [loading, setLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loadBalance, setLoadBalance] = useState(true)
  const [lockLabel, setLockLabel] = useState('assignee-locked')

  async function load(){
    try{
      const r = await fetch('/api/admin/proxy?path=' + encodeURIComponent('/admin/services/configs?service=jira'), { cache: 'no-store' })
      const j = await r.json()
      const map: Record<string, Row> = {}
      for (const c of (j?.rows||[])){
        if (PHASES.find(p => p.key===c.name)){
          map[c.name] = { id: c.id, name: c.name, value: c.value }
        }
        if (c.name === 'load_balance') setLoadBalance(String(c.value||'1') === '1')
        if (c.name === 'assignment_lock_label') setLockLabel(String(c.value||'assignee-locked'))
      }
      setRows(PHASES.map(p => map[p.key] || { name: p.key, value: '' }))
    }catch{}
  }
  useEffect(()=>{ load() },[])

  function labelOf(name: string){ return PHASES.find(p=>p.key===name)?.label || name }

  async function save(name: string, value: string){
    setLoading(true)
    try{
      const body = { path: '/admin/services/configs', method: 'POST', body: { service: 'jira', name, value } }
      await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      await load()
      setOpen(undefined)
    }finally{ setLoading(false) }
  }

  async function remove(id?: string){
    if (!id) return
    setLoading(true)
    try{
      const body = { path: `/admin/services/configs/${encodeURIComponent(id)}`, method: 'DELETE' }
      await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      await load()
      setOpen(undefined)
    }finally{ setLoading(false) }
  }

  function parsePeople(v: string){
    const parts = String(v||'').split(/[;,\n]+/).map(s=>s.trim()).filter(Boolean)
    return parts.map(p => {
      if (p.includes('|')) { const [name,title] = p.split('|'); return { name: name.trim(), title: (title||'').trim() } }
      const m = p.match(/^(.*)\((.*)\)$/)
      if (m) return { name: m[1].trim(), title: m[2].trim() }
      return { name: p, title: '' }
    })
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">Enter Jira display names or emails. Use commas/semicolons to list multiple users (round‑robin / least‑loaded assignment). Optional titles via “Name|Title” or “Name (Title)”.</div>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Phase Owners</div>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="secondary">Settings</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assignment Settings</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Load balance by availability</div>
                  <div className="text-xs text-muted-foreground">Choose least‑loaded; ties use round‑robin. Disable to use only RR/random.</div>
                </div>
                <Input type="checkbox" className="w-5 h-5" checked={loadBalance} onChange={(e)=>setLoadBalance(e.target.checked)} />
              </div>
              <div>
                <div className="text-sm font-medium">Assignment lock label</div>
                <div className="text-xs text-muted-foreground">If present on an issue, the portal will not override the assignee.</div>
                <Input value={lockLabel} onChange={(e)=>setLockLabel(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" onClick={async ()=>{
                  setLoading(true)
                  try{
                    await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/admin/services/configs', method:'POST', body:{ service:'jira', name:'load_balance', value: (loadBalance? '1':'0') } }) })
                    await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/admin/services/configs', method:'POST', body:{ service:'jira', name:'assignment_lock_label', value: lockLabel||'assignee-locked' } }) })
                    await load(); setSettingsOpen(false)
                  } finally { setLoading(false) }
                }} disabled={loading}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {rows.map(r=> (
          <div key={r.name} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{labelOf(r.name)}</div>
              <div className="text-xs text-muted-foreground break-words">
                {parsePeople(r.value).length>0 ? (
                  <div className="flex flex-wrap gap-2">
                    {parsePeople(r.value).map((p,i)=> (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded border text-xs">{p.name}{p.title? ` (${p.title})`: ''}</span>
                    ))}
                  </div>
                ) : '—'}
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={open===r.name} onOpenChange={(o)=> { if(!o) setOpen(undefined) }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary" onClick={()=> { setVal(r.value||''); setOpen(r.name) }}>Edit</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Edit {labelOf(r.name)} assignees</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">Comma/semicolon separated names or emails</div>
                    <Input value={val} onChange={e=>setVal(e.target.value)} placeholder="e.g., Lucas Meyer, Carlos Hernández; Sophia Li" />
                    <div className="flex gap-2 justify-end">
                      {r.id && (<Button type="button" variant="destructive" disabled={loading} onClick={()=>remove(r.id)}>Delete</Button>)}
                      <Button type="button" onClick={()=>save(r.name, val)} disabled={loading}>Save</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
