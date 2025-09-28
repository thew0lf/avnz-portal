"use client"
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

export default function DateRangeTodayFilter({ entity }: { entity: 'orders' | 'customers' | 'transactions' }){
  const router = useRouter()
  const params = useSearchParams()
  const todayDefault = (params.get('today') ?? '1') === '1'
  const [today, setToday] = useState(todayDefault)
  const [from, setFrom] = useState(params.get('from') || '')
  const [to, setTo] = useState(params.get('to') || '')

  // When toggling Today, clear from/to and push URL
  const toggleToday = useCallback((v: boolean)=>{
    setToday(v)
    const sp = new URLSearchParams(params.toString())
    sp.delete('offset')
    if (v) {
      sp.set('today','1')
      sp.delete('from')
      sp.delete('to')
      router.push(`?${sp.toString()}`)
    } else {
      sp.set('today','0')
      router.push(`?${sp.toString()}`)
    }
  }, [params, router])

  function onDateChange(which: 'from'|'to', value: string){
    if (which==='from') setFrom(value); else setTo(value)
    const sp = new URLSearchParams(params.toString())
    sp.delete('offset')
    sp.set('today','0')
    if (value) sp.set(which, new Date(value).toISOString()); else sp.delete(which)
    router.push(`?${sp.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={today} onChange={e=>toggleToday((e.target as HTMLInputElement).checked)} /> Today
      </label>
      <div className="text-xs text-muted-foreground">or range:</div>
      <input type="date" className="border rounded h-8 px-2 text-sm" value={from ? new Date(from).toISOString().slice(0,10) : ''} onChange={e=>onDateChange('from', (e.target as HTMLInputElement).value)} />
      <span>→</span>
      <input type="date" className="border rounded h-8 px-2 text-sm" value={to ? new Date(to).toISOString().slice(0,10) : ''} onChange={e=>onDateChange('to', (e.target as HTMLInputElement).value)} />
      <a
        className="border rounded h-8 px-3 inline-flex items-center bg-white hover:bg-gray-50"
        href={`/billing/${entity}?${params.toString()}&format=csv`}
        target="_blank"
        rel="noopener noreferrer"
      >Export CSV</a>
    </div>
  )
}

