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
                  <div className="text-xs text-muted-foreground">
                    {/* Additional settings can be added here */}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

