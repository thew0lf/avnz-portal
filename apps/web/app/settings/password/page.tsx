"use client"
import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

export default function PasswordSettingsPage(){
  const { success, error } = useToast()
  const [current, setCurrent] = React.useState('')
  const [next, setNext] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [errs, setErrs] = React.useState<string | null>(null)

  function validate(): boolean {
    // Policy: 12+ chars, upper/lower/number/symbol (aligns with backend default)
    const rules = [
      { test: (s:string)=>s.length>=12, msg:'Password must be at least 12 characters' },
      { test: (s:string)=>/[A-Z]/.test(s), msg:'Include an uppercase letter' },
      { test: (s:string)=>/[a-z]/.test(s), msg:'Include a lowercase letter' },
      { test: (s:string)=>/[0-9]/.test(s), msg:'Include a number' },
      { test: (s:string)=>/[^A-Za-z0-9]/.test(s), msg:'Include a symbol' },
    ]
    for (const r of rules) if (!r.test(next)) { setErrs(r.msg); return false }
    if (next !== confirm) { setErrs('Passwords do not match'); return false }
    setErrs(null)
    return true
  }

  async function submit(e: React.FormEvent){
    e.preventDefault()
    if (!validate()) return
    try{
      // Backend endpoint not yet available; surface a message for now.
      // Placeholder POST to make wiring trivial to switch later.
      const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/me/change-password', method:'POST', body: { current_password: current, new_password: next } }) })
      if (r.ok) success('Password updated')
      else error('Could not update password')
    } catch { error('Could not update password') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Password</h1>
        <p className="text-sm text-muted-foreground">Update your password. Use a strong, unique passphrase.</p>
      </div>
      <form method="post" onSubmit={submit} className="rounded-md border bg-white p-4 space-y-3" aria-label="Password form">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm text-muted-foreground">Current password</label>
            <Input type="password" value={current} onChange={e=>setCurrent((e.target as HTMLInputElement).value)} required />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground">New password</label>
            <Input type="password" value={next} onChange={e=>setNext((e.target as HTMLInputElement).value)} required />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground">Confirm password</label>
            <Input type="password" value={confirm} onChange={e=>setConfirm((e.target as HTMLInputElement).value)} required />
          </div>
        </div>
        {errs && <div role="alert" className="text-sm text-red-600">{errs}</div>}
        <div className="pt-1"><Button type="submit">Save password</Button></div>
      </form>
    </div>
  )
}
