"use client"
import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

export default function OrgEditForm({ org }: { org: any }){
  const { success, error } = useToast()
  const [name, setName] = React.useState<string>(org?.name || '')
  const [code, setCode] = React.useState<string>('')
  const initialCodeRef = React.useRef<string>(org?.code || '')
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = React.useState<string>('')
  async function onSubmit(e: React.FormEvent){
    e.preventDefault()
    setServerError(null)
    try{
      // basic client validation for code
      if (!name.trim()) { setServerError('Name is required'); return }
      const trimmed = code.trim()
      if (trimmed.length > 0 && !/^[a-z0-9-]{3,32}$/.test(trimmed)) { setServerError('Code must be 3-32 chars: lowercase letters, numbers, hyphens'); return }
      if (trimmed && trimmed !== initialCodeRef.current) {
        const proceed = confirm('Changing the organization code can impact legacy integrations that reference the old code. Are you sure you want to proceed?')
        if (!proceed) return
      }
      const body: any = { name }
      if (trimmed) {
        if (!currentPassword) { setServerError('Current password is required to change the org code'); return }
        body.code = trimmed; body.current_password = currentPassword
      }
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/orgs/update', method: 'POST', body }) })
      if (!r.ok) { try{ const d=await r.json(); const msg=d?.error||d?.message||'Update failed'; setServerError(msg); error(msg) } catch { const m='Update failed'; setServerError(m); error(m) } return }
      success('Organization updated')
    } catch { error('Update failed') }
  }
  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3 items-end">
      <div className="md:col-span-3 rounded-md border border-yellow-300 bg-yellow-50 text-yellow-900 p-3 text-sm">
        Changing the org code can affect legacy tools or scripts that reference the old code. Proceed with caution.
      </div>
      <div className="md:col-span-1">
        <label className="block text-sm text-muted-foreground">Name</label>
        <Input value={name} onChange={e=>setName((e.target as HTMLInputElement).value)} placeholder="Organization name" />
      </div>
      <div className="md:col-span-1">
        <label className="block text-sm text-muted-foreground">New Code (optional)</label>
        <Input value={code} onChange={e=>setCode((e.target as HTMLInputElement).value)} placeholder="org-code" />
      </div>
      <div className="md:col-span-1">
        <label className="block text-sm text-muted-foreground">Current Password (required to change code)</label>
        <Input type="password" value={currentPassword} onChange={e=>setCurrentPassword((e.target as HTMLInputElement).value)} placeholder="••••••••" />
      </div>
      <div className="md:col-span-3"><Button type="submit">Save</Button></div>
      {serverError && <div className="text-sm text-red-600 md:col-span-3" role="alert">{serverError}</div>}
    </form>
  )
}
