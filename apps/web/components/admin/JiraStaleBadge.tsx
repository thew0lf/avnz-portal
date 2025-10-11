"use client"
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'

export default function JiraStaleBadge({ minutes = 30 }: { minutes?: number }){
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    async function load(){
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || ''
        const r = await fetch(`${base}/jira/stale?minutes=${minutes}`, { cache: 'no-store' })
        const d = await r.json().catch(()=>({ issues: [] }))
        const c = Array.isArray(d?.issues) ? d.issues.length : 0
        if (alive) setCount(c)
      } catch { if (alive) setCount(null) }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [minutes])
  if (count == null || count === 0) return null
  return <Badge variant="secondary" className="ml-2">{count}</Badge>
}
