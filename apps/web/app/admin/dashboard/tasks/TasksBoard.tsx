"use client"
import { useMemo, useState } from 'react'
import { RSelect, RSelectTrigger, RSelectContent, RSelectItem, RSelectValue } from '@/components/ui/rselect'
import TasksTable from './TasksTable'

type Job = { id: string, status?: string }

const ALL_STATUSES = ['queued','running','done','error','canceled']

export default function TasksBoard({ rows }: { rows: Job[] }){
  const [status, setStatus] = useState<string>('all')
  const [view, setView] = useState<'split'|'single'>('split')

  const { queued, recent, filtered } = useMemo(()=>{
    const q = rows.filter(r => ['queued','running'].includes(String(r.status||'')))
    const rc = rows.filter(r => ['done','error','canceled'].includes(String(r.status||'')))
    let f = rows
    if (status !== 'all') {
      f = rows.filter(r => String(r.status||'') === status)
    }
    return { queued: q, recent: rc, filtered: f }
  }, [rows, status])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-muted-foreground">Filter status</div>
        <RSelect value={status} onValueChange={setStatus}>
          <RSelectTrigger className="w-40"><RSelectValue placeholder="All statuses" /></RSelectTrigger>
          <RSelectContent>
            <RSelectItem value="all">All</RSelectItem>
            {ALL_STATUSES.map(s => (<RSelectItem key={s} value={s}>{s}</RSelectItem>))}
          </RSelectContent>
        </RSelect>
      </div>

      {status === 'all' ? (
        <>
          <div>
            <h3 className="text-sm font-medium mb-2">Queue</h3>
            <TasksTable rows={queued} />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Recent completed</h3>
            <TasksTable rows={recent} />
          </div>
        </>
      ) : (
        <div>
          <TasksTable rows={filtered} />
        </div>
      )}
    </div>
  )
}
