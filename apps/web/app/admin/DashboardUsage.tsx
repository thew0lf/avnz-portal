"use client"
import { useEffect, useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useLocalStorage } from './useLocalStorage'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

type Row = { provider:string; model:string; operation:string; in_tokens?:number; out_tokens?:number; embed_tokens?:number; cost_usd?:number }

export function DashboardUsageChart(){
  const [apiBase] = useLocalStorage<string>('apiBase', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001')
  const [orgId] = useLocalStorage<string>('orgId', '')
  const [roles] = useLocalStorage<string>('roles', 'org')
  const [projectCode] = useLocalStorage<string>('projectCode', '')
  const [clientFilter] = useLocalStorage<string>('clientFilter','')
  const [userFilter] = useLocalStorage<string>('userFilter','')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useLocalStorage<string>('usageFrom', '')
  const [to, setTo] = useLocalStorage<string>('usageTo', '')
  const [quickRange, setQuickRange] = useLocalStorage<string>('usageQuickRange','7d')
  // Avoid hydration mismatch: set default dates after mount if empty
  useEffect(()=>{
    if (!from) setFrom(new Date(Date.now()-7*24*3600*1000).toISOString().slice(0,10))
    if (!to) setTo(new Date().toISOString().slice(0,10))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])
  useEffect(()=>{
    // apply quick range if user clicks toggle
    const now = new Date()
    if (quickRange === 'today') { const d=new Date(now); d.setHours(0,0,0,0); setFrom(d.toISOString().slice(0,10)); setTo(now.toISOString().slice(0,10)) }
    else if (quickRange === '7d') { setFrom(new Date(Date.now()-7*24*3600*1000).toISOString().slice(0,10)); setTo(now.toISOString().slice(0,10)) }
    else if (quickRange === '30d') { setFrom(new Date(Date.now()-30*24*3600*1000).toISOString().slice(0,10)); setTo(now.toISOString().slice(0,10)) }
  }, [quickRange])
  useEffect(()=>{
    function onKey(e: KeyboardEvent){
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      const k = e.key.toLowerCase()
      if (k === 't') setQuickRange('today')
      else if (k === '7') setQuickRange('7d')
      else if (k === '3') setQuickRange('30d')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setQuickRange])
  const [groupBy, setGroupBy] = useLocalStorage<string>('usageGroupBy', 'provider,model,operation')
  async function load(){
    setLoading(true)
    try{
      const q = new URLSearchParams(); q.set('from', from); q.set('to', to); q.set('interval','day'); if (projectCode) q.set('projectCode', projectCode); if (clientFilter) q.set('clientId', clientFilter); if (userFilter) q.set('userId', userFilter);
      const r = await fetch(`/api/usage/timeseries?${q.toString()}`, { headers: { 'x-org-id': orgId, 'x-roles': roles } })
      const data = await r.json(); const rows: any[] = (data.rows||[]).map((d:any)=>({ date: new Date(d.bucket).toLocaleDateString(undefined,{ month:'short', day:'2-digit' }), cost: Number(d.cost_usd||0), tokens: Number(d.tokens||0) })); setRows(rows as any)
    } finally { setLoading(false) }
  }
  useEffect(()=>{ load() },[apiBase,orgId,roles,projectCode,clientFilter,userFilter,from,to,groupBy])
  const totals = useMemo(()=>{
    return (rows as any[]).reduce((acc, r)=>({ cost: acc.cost + Number(r.cost||0), tokens: acc.tokens, requests: acc.requests }), { cost:0, tokens:0, requests:0 })
  },[rows])
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Total Spend</div>
          <div className="text-2xl font-semibold">${totals.cost.toFixed(2)}</div>
        </div>
        <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center">
          <div className="inline-flex items-center gap-2">
            <label className="inline-flex items-center gap-1" title="Shortcut: T">
              <input type="radio" name="usage-range" checked={quickRange==='today'} onChange={()=>setQuickRange('today')} /> Today
            </label>
            <label className="inline-flex items-center gap-1" title="Shortcut: 7">
              <input type="radio" name="usage-range" checked={quickRange==='7d'} onChange={()=>setQuickRange('7d')} /> 7 days
            </label>
            <label className="inline-flex items-center gap-1" title="Shortcut: 3">
              <input type="radio" name="usage-range" checked={quickRange==='30d'} onChange={()=>setQuickRange('30d')} /> 30 days
            </label>
          </div>
          <label className="flex items-center gap-1">From <input className="border rounded px-2 h-8 w-full md:w-auto" type="date" value={from} onChange={(e)=>setFrom((e.target as HTMLInputElement).value)} /></label>
          <label className="flex items-center gap-1">To <input className="border rounded px-2 h-8 w-full md:w-auto" type="date" value={to} onChange={(e)=>setTo((e.target as HTMLInputElement).value)} /></label>
          <Popover>
            <PopoverTrigger asChild>
              <button aria-label="Help" className="h-6 w-6 rounded border text-xs leading-none">?</button>
            </PopoverTrigger>
            <PopoverContent className="w-64 text-sm">
              <div className="font-medium mb-1">Shortcuts</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>T — Today</li>
                <li>7 — Last 7 days</li>
                <li>3 — Last 30 days</li>
              </ul>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="border rounded h-8 px-2 bg-white">{groupBy === 'provider,model,operation' ? 'Group: Provider/Model/Op' : groupBy === 'provider,model' ? 'Group: Provider/Model' : 'Group: Provider'}</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={()=>setGroupBy('provider,model,operation')}>Group: Provider/Model/Op</DropdownMenuItem>
              <DropdownMenuItem onSelect={()=>setGroupBy('provider,model')}>Group: Provider/Model</DropdownMenuItem>
              <DropdownMenuItem onSelect={()=>setGroupBy('provider')}>Group: Provider</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mt-4 h-[200px] rounded border bg-white p-2">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading usage…</div>
        ) : (
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows as any[]} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <Tooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="cost" stroke="#0f172a" fill="#e5e7eb" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </div>
      <div className="mt-4 h-[200px] rounded border bg-white p-2">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading tokens…</div>
        ) : (
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows as any[]} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <Tooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="tokens" stroke="#1d4ed8" fill="#bfdbfe" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </div>
    </div>
  )
}

export function DashboardMetrics(){
  const [apiBase] = useLocalStorage<string>('apiBase', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001')
  const [orgId] = useLocalStorage<string>('orgId', '')
  const [roles] = useLocalStorage<string>('roles', 'org')
  const [projectCode] = useLocalStorage<string>('projectCode', '')
  const [rows, setRows] = useState<Row[]>([])
  const [budget, setBudget] = useState<number>(0)
  useEffect(()=>{ (async()=>{ try{ const q = new URLSearchParams(); if (projectCode) q.set('projectCode', projectCode); const r=await fetch(`/api/usage/summary?${q.toString()}`,{ headers:{ 'x-org-id': orgId, 'x-roles': roles } }); const data=await r.json(); setRows(data.rows||[]) } catch{} })() },[orgId,roles,projectCode])
  useEffect(()=>{ (async()=>{ try{ const r=await fetch(`${apiBase}/admin/budget?nodeId=${encodeURIComponent(orgId)}`,{ headers:{ authorization: '' } }); const d=await r.json().catch(()=>({monthly_limit_usd:0})); setBudget(Number(d.monthly_limit_usd||0)) } catch{} })() },[apiBase,orgId])
  const totals = useMemo(()=>{
    return rows.reduce((acc, r)=>({
      cost: acc.cost + Number(r.cost_usd||0),
      tokens: acc.tokens + Number(r.in_tokens||0) + Number(r.out_tokens||0) + Number(r.embed_tokens||0),
      requests: acc.requests + 1,
    }), { cost:0, tokens:0, requests:0 })
  },[rows])
  const pct = budget>0 ? Math.min(100, (totals.cost / budget) * 100) : 0
  return (
    <div className="space-y-3">
      <div className="p-3 border rounded-md">
        <div className="text-sm text-muted-foreground">Monthly budget</div>
        <div className="font-medium">${totals.cost.toFixed(2)} / ${budget.toFixed(2)}</div>
        <div className="mt-2 h-1 bg-gray-200 rounded"><div className="h-1 bg-gray-800 rounded" style={{width:`${pct}%`}}/></div>
        <div className="text-xs text-muted-foreground mt-1">Resets monthly</div>
        <BudgetEditor apiBase={apiBase} orgId={orgId} current={budget} onSaved={setBudget} />
      </div>
      <div className="p-3 border rounded-md">
        <div className="text-sm text-muted-foreground">Total tokens</div>
        <div className="font-medium">{totals.tokens.toLocaleString()}</div>
      </div>
      <div className="p-3 border rounded-md">
        <div className="text-sm text-muted-foreground">Total requests</div>
        <div className="font-medium">{totals.requests.toLocaleString()}</div>
      </div>
    </div>
  )
}

function BudgetEditor({ apiBase, orgId, current, onSaved }:{ apiBase:string; orgId:string; current:number; onSaved:(n:number)=>void }){
  const [val, setVal] = useState<string>(current ? String(current) : '120')
  const [saving, setSaving] = useState(false)
  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      <input className="border rounded px-2 h-8 w-24" type="number" step="0.01" value={val} onChange={(e)=>setVal((e.target as HTMLInputElement).value)} />
      <button className="px-2 py-1 rounded border" disabled={saving} onClick={async()=>{ setSaving(true); try{ await fetch(`${apiBase}/admin/budget?nodeId=${encodeURIComponent(orgId)}`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ monthly_limit_usd: Number(val||0) }) }); onSaved(Number(val||0)) } finally { setSaving(false) } }}>Save</button>
    </div>
  )
}
