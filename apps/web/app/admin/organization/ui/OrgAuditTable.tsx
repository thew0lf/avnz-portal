"use client"
import * as React from 'react'

export default function OrgAuditTable({ rows: initialRows, pageSize = 50, baseQuery = '' }: { rows: any[]; pageSize?: number; baseQuery?: string }){
  const [rows, setRows] = React.useState<any[]>(initialRows || [])
  const [offset, setOffset] = React.useState<number>(rows.length)
  const [loading, setLoading] = React.useState(false)
  async function loadMore(){
    setLoading(true)
    try{
      const sep = baseQuery ? (baseQuery.startsWith('?') ? '&' : '?') : '?'
      const qs = `${baseQuery || ''}${sep}limit=${encodeURIComponent(String(pageSize))}&offset=${encodeURIComponent(String(offset))}`
      const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path: `/orgs/audit${qs}`, method:'GET' }) })
      if (r.ok){ const d = await r.json(); const more = d?.rows || []; setRows(prev => [...prev, ...more]); setOffset(offset + more.length) }
    } finally { setLoading(false) }
  }
  if (!rows?.length) return <div className="text-sm text-muted-foreground">No recent audit events.</div>
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Time (UTC)</th>
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Action</th>
              <th className="py-2 pr-3">Entity</th>
              <th className="py-2 pr-3">Entity ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r:any, idx:number)=> (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-1.5 pr-3 whitespace-nowrap">{new Date(r.created_at).toISOString().replace('T',' ').replace('Z','')}</td>
              <td className="py-1.5 pr-3">
                {r.user_email ? (
                  <span title={r.user_id || ''}>{r.user_email}{r.user_id ? ` (${String(r.user_id).slice(0,8)}…)` : ''}</span>
                ) : (r.user_id || '-')}
              </td>
                <td className="py-1.5 pr-3">{r.action}</td>
                <td className="py-1.5 pr-3">{r.entity}</td>
                <td className="py-1.5 pr-3 truncate max-w-[24ch]" title={r.entity_id || ''}>{r.entity_id || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <button className="h-8 rounded border px-3 text-sm" onClick={loadMore} disabled={loading}>{loading? 'Loading...' : 'Load more'}</button>
      </div>
    </div>
  )
}
