"use client"
import * as React from 'react'
import { RSelect, RSelectTrigger, RSelectContent, RSelectItem, RSelectValue, RSelectGroup, RSelectLabel, RSelectSeparator } from '@/components/ui/rselect'
import { Input } from '@/components/ui/input'

export type SRItem = { value: string; label: string; group?: string }

export default function SearchableRSelect({ value, onValueChange, items, placeholder = 'Select...', groupBy, className }: {
  value: string
  onValueChange: (v: string) => void
  items: SRItem[]
  placeholder?: string
  groupBy?: (item: SRItem) => string
  className?: string
}) {
  const CLEAR_VALUE = '__none__'
  const [q, setQ] = React.useState('')
  // Radix Select disallows Item with an empty string value. Filter those out defensively.
  const safeItems = React.useMemo(() => items.filter(i => String(i.value || '') !== ''), [items])
  const filtered = React.useMemo(() => {
    const needle = q.toLowerCase()
    return safeItems.filter(i => i.label.toLowerCase().includes(needle))
  }, [q, safeItems])
  const groups = React.useMemo(() => {
    const g: Record<string, SRItem[]> = {}
    for (const item of filtered) {
      const key = item.group ?? (groupBy ? groupBy(item) : (item.label.charAt(0).toUpperCase() || '#'))
      ;(g[key] ||= []).push(item)
    }
    return Object.entries(g).sort(([a],[b]) => a.localeCompare(b)) as [string, SRItem[]][]
  }, [filtered, groupBy])
  return (
    <RSelect value={value} onValueChange={(v)=> onValueChange(v === CLEAR_VALUE ? '' : v)}>
      <RSelectTrigger className={className}><RSelectValue placeholder={placeholder} /></RSelectTrigger>
      <RSelectContent>
        <div className="p-1"><Input placeholder="Filter…" value={q} onChange={(e)=>setQ((e.target as HTMLInputElement).value)} /></div>
        <RSelectItem value={CLEAR_VALUE}>{placeholder}</RSelectItem>
        <RSelectSeparator />
        {groups.map(([label, list]) => (
          <RSelectGroup key={label}>
            <RSelectLabel>{label}</RSelectLabel>
            {list.map((i) => (<RSelectItem key={i.value} value={i.value}>{i.label}</RSelectItem>))}
          </RSelectGroup>
        ))}
      </RSelectContent>
    </RSelect>
  )
}
