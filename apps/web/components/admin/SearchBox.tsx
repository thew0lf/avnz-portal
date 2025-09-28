"use client"
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

export default function SearchBox({ placeholder }: { placeholder: string }){
  const router = useRouter()
  const params = useSearchParams()
  const initial = params.get('q') || ''
  const [q, setQ] = useState(initial)
  // debounce
  const debounced = useMemo(()=>{
    let t: any
    return (value: string) => {
      clearTimeout(t)
      t = setTimeout(()=>{
        const sp = new URLSearchParams(params.toString())
        if (value) sp.set('q', value); else sp.delete('q')
        sp.delete('offset') // reset pagination on new search
        router.push(`?${sp.toString()}`)
      }, 300)
    }
  // params is a readonly proxy; stringify for memo dep
  }, [router, params.toString()])

  // Keep input synced if URL changes externally
  useEffect(()=>{ setQ(initial) }, [initial])

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>)=>{
    const v = e.target.value
    setQ(v)
    debounced(v)
  }, [debounced])

  return (
    <input
      className="border rounded h-9 px-2 w-64"
      placeholder={placeholder}
      value={q}
      onChange={onChange}
    />
  )
}

