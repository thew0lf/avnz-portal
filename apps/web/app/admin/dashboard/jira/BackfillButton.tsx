"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast-provider'

export default function BackfillButton(){
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { success, error } = useToast()
  async function run(){
    setLoading(true)
    try{
      // Try new backfill endpoint; fallback to legacy requeue-stale if not found
      let r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/jira/backfill', method:'POST' }) })
      if (r.status === 404) {
        r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/jira/requeue-stale', method:'POST' }) })
      }
      const j = await r.json().catch(()=>({ ok:false }))
      if (j?.ok) success('Queued In‑Progress')
      else error('Unable to queue; check JIRA config')
      router.refresh()
    } finally { setLoading(false) }
  }
  return (
    <Button onClick={run} disabled={loading}>{loading? 'Queuing...' : 'Queue In‑Progress'}</Button>
  )
}
