"use client"
import * as React from 'react'

export default function TemplatesDiagnostics({ nodeId }: { nodeId: string }){
  const [status, setStatus] = React.useState<'idle'|'ok'|'error'>('idle')
  const [message, setMessage] = React.useState<string>('')
  async function check(){
    setStatus('idle'); setMessage('')
    try{
      const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path: `/admin/security-settings?nodeId=${encodeURIComponent(nodeId)}`, method:'GET' }) })
      if (!r.ok) { const t = await r.text(); setStatus('error'); setMessage(`RBAC check failed (${r.status}): ${t.slice(0,200)}`) }
      else { setStatus('ok'); setMessage('RBAC check OK for nodeId') }
    } catch (e:any) { setStatus('error'); setMessage('RBAC check request failed') }
  }
  React.useEffect(()=>{ if (nodeId) { check() } }, [nodeId])
  return (
    <div className="rounded-md border bg-white p-3 text-sm">
      <div className="font-medium mb-1">Diagnostics</div>
      <div className="text-muted-foreground">nodeId: <code>{nodeId || '(none)'}</code></div>
      <div className={status==='ok' ? 'text-green-600' : status==='error' ? 'text-red-600' : 'text-muted-foreground'}>{message || 'Running check…'}</div>
      <div className="mt-2"><button className="h-8 rounded border px-2" type="button" onClick={check}>Re-run</button></div>
    </div>
  )
}

