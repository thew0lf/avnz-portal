"use client"
import { useRouter, useSearchParams } from 'next/navigation'

export default function QuerySelect({ name, options, label, className }: { name: string; options: { value: string; label: string }[]; label?: string; className?: string }){
  const router = useRouter()
  const params = useSearchParams()
  const value = params.get(name) || ''
  function onChange(e: React.ChangeEvent<HTMLSelectElement>){
    const v = e.target.value
    const sp = new URLSearchParams(params.toString())
    sp.delete('offset')
    if (v) sp.set(name, v); else sp.delete(name)
    router.push(`?${sp.toString()}`)
  }
  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className||''}`}>
      {label && <span className="text-muted-foreground">{label}</span>}
      <select className="border rounded h-8 px-2 text-sm" value={value} onChange={onChange}>
        {options.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
      </select>
    </label>
  )
}

