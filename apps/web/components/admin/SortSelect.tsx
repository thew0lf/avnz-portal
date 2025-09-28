"use client"
import { useRouter, useSearchParams } from 'next/navigation'

export default function SortSelect({ name, dirName = 'dir', options }: { name: string; dirName?: string; options: { value: string; label: string }[] }){
  const router = useRouter()
  const params = useSearchParams()
  const sort = params.get(name) || options[0]?.value || 'created_at'
  const dir = (params.get(dirName) || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'
  function setParam(k: string, v?: string){ const sp = new URLSearchParams(params.toString()); sp.delete('offset'); if (v) sp.set(k, v); else sp.delete(k); router.push(`?${sp.toString()}`) }
  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Sort</span>
      <select className="border rounded h-8 px-2 text-sm" value={sort} onChange={e => setParam(name, (e.target as HTMLSelectElement).value)}>
        {options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      <select className="border rounded h-8 px-2 text-sm" value={dir} onChange={e => setParam(dirName, (e.target as HTMLSelectElement).value)}>
        <option value="desc">Desc</option>
        <option value="asc">Asc</option>
      </select>
    </div>
  )
}

