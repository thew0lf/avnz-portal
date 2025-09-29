"use client"
import { ActionButton } from '@/components/admin/ActionButton'
import { useState } from 'react'

export default function RequeueStaleButton(){
  const [minutes, setMinutes] = useState(30)
  return (
    <div className="flex items-end gap-2">
      <div>
        <label className="block text-xs text-muted-foreground">Minutes</label>
        <input type="number" min={5} value={minutes} onChange={e=> setMinutes(parseInt(e.target.value||'30',10))} className="border rounded px-2 py-1 w-20" />
      </div>
      <ActionButton label="Requeue Stale" path={`/jira/requeue-stale?minutes=${minutes}`} />
    </div>
  )
}

