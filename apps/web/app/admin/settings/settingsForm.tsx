"use client"
import * as React from 'react'
import { useToast } from '@/components/ui/toast-provider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const schemes = ['default','red','rose','orange','green','blue','yellow','violet']

export default function SettingsForm({ profile, preferences }: any){
  const { success, error } = useToast()
  const [theme, setTheme] = React.useState<string>(preferences?.theme || 'system')
  const [scheme, setScheme] = React.useState<string>(preferences?.color_scheme || 'default')
  const [pf, setPf] = React.useState<any>({
    first_name: profile?.first_name||'', last_name: profile?.last_name||'', company: profile?.company||'', phone: profile?.phone||'',
    address1: profile?.address1||'', address2: profile?.address2||'', city: profile?.city||'', state_province: profile?.state_province||'', postal_code: profile?.postal_code||'', country: profile?.country||''
  })

  React.useEffect(()=>{
    // apply theme locally and persist in localStorage
    try { localStorage.setItem('theme', theme) } catch {}
    try { localStorage.setItem('colorScheme', scheme) } catch {}
    const root = document.documentElement
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const useDark = theme === 'dark' || (theme === 'system' && prefersDark)
    root.classList.toggle('dark', useDark)
    root.setAttribute('data-color', scheme)
  }, [theme, scheme])

  async function savePrefs(){
    try{
      const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/me/preferences', method:'POST', body: { theme, color_scheme: scheme } }) })
      if (r.ok) success('Preferences saved'); else error('Could not save preferences')
    } catch { error('Could not save preferences') }
  }

  async function saveProfile(e: React.FormEvent){
    e.preventDefault()
    try{
      const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/me/profile', method:'POST', body: pf }) })
      if (r.ok) success('Profile saved'); else error('Could not save profile')
    } catch { error('Could not save profile') }
  }

  return (
    <div className="grid gap-8 md:grid-cols-5">
      <section className="space-y-4 md:col-span-2">
        <div>
          <h2 className="text-lg font-medium">Appearance</h2>
          <p className="text-sm text-muted-foreground">Choose how the portal looks on your device.</p>
        </div>
        <div className="grid gap-4 rounded-lg border bg-white p-4">
          <div>
            <div className="text-sm font-medium mb-2">Theme</div>
            <div className="flex gap-2">
              {['system','light','dark'].map((t)=> (
                <button key={t} type="button" onClick={()=>setTheme(t)} className={`border rounded-md px-3 py-1.5 text-sm capitalize ${theme===t?'bg-gray-100 border-gray-300':'hover:bg-gray-50'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Color scheme</div>
            <div className="grid grid-cols-4 gap-2">
              {schemes.map((s)=> (
                <button key={s} type="button" onClick={()=>setScheme(s)} className={`group relative flex items-center gap-2 rounded-md border p-2 text-sm capitalize ${scheme===s?'bg-gray-100 border-gray-300':'hover:bg-gray-50'}`}>
                  <span className="inline-block h-4 w-4 rounded-full" style={{ background: 'hsl(var(--primary))' }}></span>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-1"><Button type="button" onClick={savePrefs}>Save preferences</Button></div>
        </div>
      </section>
      <section className="space-y-4 md:col-span-3">
        <div>
          <h2 className="text-lg font-medium">Profile</h2>
          <p className="text-sm text-muted-foreground">Your account details for billing and communications.</p>
        </div>
        <form className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2" onSubmit={saveProfile}>
          <div><label className="block text-sm text-muted-foreground">First name</label><Input value={pf.first_name} onChange={e=>setPf({...pf, first_name:(e.target as HTMLInputElement).value})} /></div>
          <div><label className="block text-sm text-muted-foreground">Last name</label><Input value={pf.last_name} onChange={e=>setPf({...pf, last_name:(e.target as HTMLInputElement).value})} /></div>
          <div className="md:col-span-2"><label className="block text-sm text-muted-foreground">Company</label><Input value={pf.company} onChange={e=>setPf({...pf, company:(e.target as HTMLInputElement).value})} /></div>
          <div className="md:col-span-2"><label className="block text-sm text-muted-foreground">Phone</label><Input value={pf.phone} onChange={e=>setPf({...pf, phone:(e.target as HTMLInputElement).value})} /></div>
          <div className="md:col-span-2"><label className="block text-sm text-muted-foreground">Address line 1</label><Input value={pf.address1} onChange={e=>setPf({...pf, address1:(e.target as HTMLInputElement).value})} /></div>
          <div className="md:col-span-2"><label className="block text-sm text-muted-foreground">Address line 2</label><Input value={pf.address2} onChange={e=>setPf({...pf, address2:(e.target as HTMLInputElement).value})} /></div>
          <div><label className="block text-sm text-muted-foreground">City</label><Input value={pf.city} onChange={e=>setPf({...pf, city:(e.target as HTMLInputElement).value})} /></div>
          <div><label className="block text-sm text-muted-foreground">State/Province</label><Input value={pf.state_province} onChange={e=>setPf({...pf, state_province:(e.target as HTMLInputElement).value})} /></div>
          <div><label className="block text-sm text-muted-foreground">Postal code</label><Input value={pf.postal_code} onChange={e=>setPf({...pf, postal_code:(e.target as HTMLInputElement).value})} /></div>
          <div><label className="block text-sm text-muted-foreground">Country</label><Input value={pf.country} onChange={e=>setPf({...pf, country:(e.target as HTMLInputElement).value})} /></div>
          <div className="md:col-span-2 pt-1"><Button type="submit">Save profile</Button></div>
        </form>
      </section>
    </div>
  )
}
