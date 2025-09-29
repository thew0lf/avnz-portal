"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast-provider'

export default function BackfillButton(){
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast?.() || { toast: (o:any)=> alert(o?.title||'Done') }
  async function run(){
    setLoading(true)
    try{
      const body = { path:'/jira/backfill', method:'POST' }
      const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) })
      const j = await r.json().catch(()=>({ ok:false }))
      toast({ title: j.ok? 'Queued In‑Progress' : 'Backfill completed', description: j.ok? undefined : JSON.stringify(j) })
      router.refresh()
    } finally { setLoading(false) }
  }
  return (
    <Button onClick={run} disabled={loading}>{loading? 'Queuing...' : 'Queue In‑Progress'}</Button>
  )
}