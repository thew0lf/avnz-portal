"use client"
import { useMemo, useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export default function TokensChart({ rows }: { rows: any[] }){
  const [range, setRange] = useState<'today'|'7d'|'30d'>('7d')
  const [showIn, setShowIn] = useState(true)
  const [showOut, setShowOut] = useState(true)
  const [showEmb, setShowEmb] = useState(false)

  const now = Date.now()
  const startTs = useMemo(()=>{
    const d = new Date(now)
    if (range === 'today') { d.setHours(0,0,0,0); return d.getTime() }
    if (range === '7d') return now - 7*24*3600*1000
    return now - 30*24*3600*1000
  }, [now, range])

  const data = useMemo(()=>{
    const m = new Map<string, { in:number; out:number; emb:number }>()
    for (const r of rows||[]) {
      const ts = Number(r.created_at||0) * 1000
      if (!ts || ts < startTs) continue
      const dayKey = new Date(new Date(ts).toISOString().slice(0,10)).toISOString().slice(0,10)
      const usage = (r.result && r.result.usage) || {}
      const cur = m.get(dayKey) || { in:0, out:0, emb:0 }
      cur.in += Number(usage.input_tokens||0)
      cur.out += Number(usage.output_tokens||0)
      cur.emb += Number(usage.embed_tokens||0)
      m.set(dayKey, cur)
    }
    return Array.from(m.entries())
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([k,v])=>({ date: new Date(k).toLocaleDateString(undefined,{ month:'short', day:'2-digit' }), in: v.in, out: v.out, emb: v.emb }))
  }, [rows, startTs])

  // Keyboard shortcuts: T for today, 7 for 7d, 3 for 30d; I/O/E to toggle series
  useEffect(()=>{
    function onKey(e: KeyboardEvent){
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      const k = e.key.toLowerCase()
      if (k === 't') setRange('today')
      else if (k === '7') setRange('7d')
      else if (k === '3') setRange('30d')
      else if (k === 'i') setShowIn(v=>!v)
      else if (k === 'o') setShowOut(v=>!v)
      else if (k === 'e') setShowEmb(v=>!v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="mt-4">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
        <div className="inline-flex items-center gap-2">
          <label className="inline-flex items-center gap-1" title="Shortcut: T">
            <input type="radio" name="range" checked={range==='today'} onChange={()=>setRange('today')} /> Today
          </label>
          <label className="inline-flex items-center gap-1" title="Shortcut: 7">
            <input type="radio" name="range" checked={range==='7d'} onChange={()=>setRange('7d')} /> 7 days
          </label>
          <label className="inline-flex items-center gap-1" title="Shortcut: 3">
            <input type="radio" name="range" checked={range==='30d'} onChange={()=>setRange('30d')} /> 30 days
          </label>
        </div>
        <div className="inline-flex items-center gap-2">
          <label className="inline-flex items-center gap-1" title="Toggle (I)"><input type="checkbox" checked={showIn} onChange={e=>setShowIn(e.currentTarget.checked)} /> Input</label>
          <label className="inline-flex items-center gap-1" title="Toggle (O)"><input type="checkbox" checked={showOut} onChange={e=>setShowOut(e.currentTarget.checked)} /> Output</label>
          <label className="inline-flex items-center gap-1" title="Toggle (E)"><input type="checkbox" checked={showEmb} onChange={e=>setShowEmb(e.currentTarget.checked)} /> Embed</label>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button aria-label="Help" className="h-6 w-6 rounded border text-xs leading-none">?</button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-sm">
            <div className="font-medium mb-1">Shortcuts</div>
            <ul className="list-disc pl-4 space-y-1">
              <li>T — Today</li>
              <li>7 — Last 7 days</li>
              <li>3 — Last 30 days</li>
              <li>I — Toggle Input series</li>
              <li>O — Toggle Output series</li>
              <li>E — Toggle Embed series</li>
            </ul>
          </PopoverContent>
        </Popover>
      </div>
      <div className="h-[220px] rounded border bg-white p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
            <Tooltip formatter={(v, n)=>[String(v), n==='in'?'Input':'Output']} />
            <Legend />
            {showIn && (<Area type="monotone" dataKey="in" name="Input" stroke="#1d4ed8" fill="#bfdbfe" strokeWidth={2} stackId="t" />)}
            {showOut && (<Area type="monotone" dataKey="out" name="Output" stroke="#047857" fill="#bbf7d0" strokeWidth={2} stackId="t" />)}
            {showEmb && (<Area type="monotone" dataKey="emb" name="Embed" stroke="#7c3aed" fill="#e9d5ff" strokeWidth={2} stackId="t" />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
