"use client"
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schemes = ['default','red','rose','orange','green','blue','yellow','violet'] as const
type Scheme = typeof schemes[number]
type Mode = 'light'|'dark'|'system'

export default function AppearanceSettingsPage(){
  const { success, error } = useToast()
  const [theme, setTheme] = React.useState<Mode>('light')
  const [scheme, setScheme] = React.useState<Scheme>('default')

  React.useEffect(()=>{
    try {
      const t = (localStorage.getItem('theme') as Mode) || 'light'
      const c = (localStorage.getItem('colorScheme') as Scheme) || 'default'
      setTheme(t)
      setScheme(c)
      applyTheme(t, c)
    } catch {}
  },[])

  function applyTheme(t: Mode, c: Scheme){
    const root = document.documentElement
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const useDark = t === 'dark' || (t === 'system' && prefersDark)
    root.classList.toggle('dark', useDark)
    root.setAttribute('data-color', c)
    try { localStorage.setItem('theme', t) } catch {}
    try { localStorage.setItem('colorScheme', c) } catch {}
  }

  async function save(){
    try{
      const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/me/preferences', method:'POST', body: { theme, color_scheme: scheme } }) })
      if (r.ok) success('Preferences saved')
      else error('Could not save preferences')
    } catch { error('Could not save preferences') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Appearance</h1>
        <p className="text-sm text-muted-foreground">Choose theme mode and color scheme. Changes preview instantly.</p>
      </div>
      <form method="post" onSubmit={(e)=>{ e.preventDefault(); save() }} className="rounded-md border bg-white p-4 space-y-4" aria-label="Appearance form">
        <div>
          <div className="text-sm font-medium mb-2">Theme</div>
          <div className="flex gap-2">
            {(['light','dark','system'] as Mode[]).map((t)=> (
              <button key={t} type="button" onClick={()=>{ setTheme(t); applyTheme(t, scheme) }} className={`border rounded-md px-3 py-1.5 text-sm capitalize ${theme===t?'bg-gray-100 border-gray-300':'hover:bg-gray-50'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Color scheme</div>
          <div className="grid grid-cols-4 gap-2">
            {schemes.map((s)=> (
              <button key={s} type="button" onClick={()=>{ setScheme(s); applyTheme(theme, s) }} className={`group relative flex items-center gap-2 rounded-md border p-2 text-sm capitalize ${scheme===s?'bg-gray-100 border-gray-300':'hover:bg-gray-50'}`}>
                <span className="inline-block h-4 w-4 rounded-full" style={{ background: 'hsl(var(--primary))' }} />
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="pt-1"><Button type="submit">Save preferences</Button></div>
      </form>
    </div>
  )
}
