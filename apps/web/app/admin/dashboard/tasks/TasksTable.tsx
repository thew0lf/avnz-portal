"use client"
import { DataTable, CommonColumn, makeActionsColumn } from '@/components/ui/data-table'
import { useRouter } from 'next/navigation'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

function fmt(ts?: number){ if(!ts) return '—'; try{ return new Date(ts*1000).toLocaleString() }catch{ return '—' } }

export default function TasksTable({ rows }: { rows: any[] }){
  const router = useRouter()
  async function cancel(row: any){
    try { await fetch(`/api/agents/jobs/${row.id}/cancel`, { method: 'POST' }) } catch {}
    router.refresh()
  }
  const columns: CommonColumn<any>[] = [
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => fmt(row.original.created_at) },
    { accessorKey: 'id', header: 'ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span> },
    { accessorKey: 'task', header: 'Task', cell: ({ row }) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="line-clamp-2 max-w-[28rem] cursor-help">{row.original.task}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-[28rem] whitespace-pre-wrap">{row.original.task}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => row.original.status },
    { accessorKey: 'started_at', header: 'Started', cell: ({ row }) => fmt(row.original.started_at) },
    { accessorKey: 'finished_at', header: 'Finished', cell: ({ row }) => fmt(row.original.finished_at) },
    makeActionsColumn({ viewHref: (r:any)=>`/admin/dashboard/tasks/${r.id}`, onDelete: cancel })
  ]
  return <DataTable data={rows} columns={columns} />
}
