"use client"
import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

export default function ProfileForm({ email, profile }: { email: string; profile: any }){
  const { success, error } = useToast()
  const [firstName, setFirstName] = React.useState<string>(profile?.first_name || '')
  const [lastName, setLastName] = React.useState<string>(profile?.last_name || '')
  async function save(e: React.FormEvent){
    e.preventDefault()
    try{
      const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/me/profile', method:'POST', body: { first_name:firstName, last_name:lastName } }) })
      if (r.ok) success('Profile saved')
      else error('Could not save profile')
    } catch { error('Could not save profile') }
  }
  return (
    <form className="rounded-md border bg-white p-4 space-y-3" method="post" onSubmit={save} aria-label="Profile form">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm text-muted-foreground">First name</label>
          <Input value={firstName} onChange={e=>setFirstName((e.target as HTMLInputElement).value)} />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Last name</label>
          <Input value={lastName} onChange={e=>setLastName((e.target as HTMLInputElement).value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-muted-foreground">Email</label>
          <Input value={email} readOnly aria-readonly />
        </div>
      </div>
      <div className="pt-1"><Button type="submit">Save</Button></div>
    </form>
  )
}
