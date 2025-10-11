"use client"
import { useState } from 'react'
import { ActionButton } from '@/components/admin/ActionButton'
import { Badge } from '@/components/ui/badge'

export default function ReassignExcludedButton({ orgId }: { orgId: string }){
  const [assigned, setAssigned] = useState<number | null>(null)
  return (
    <div className="inline-flex items-center gap-2">
      <ActionButton
        path={`/jira/assign-dev?target=exclude&orgId=${encodeURIComponent(orgId||'')}`}
        label="Reassign Devs"
        variant="secondary"
        onResult={(data, ok) => {
          if (ok && data && typeof data.assigned === 'number') setAssigned(data.assigned)
        }}
      />
      {assigned !== null && <Badge variant="secondary" className="ml-1">{assigned}</Badge>}
    </div>
  )
}

