"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { RSelect, RSelectTrigger, RSelectContent, RSelectItem, RSelectValue, RSelectGroup, RSelectLabel, RSelectSeparator } from '@/components/ui/rselect'
import SearchableRSelect from '@/components/ui/searchable-rselect'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({
  email: z.string().email('Valid email required'),
  role: z.string().min(1, 'Role is required'),
  client_id: z.string().optional(),
})
type Values = z.infer<typeof schema>

export default function InviteCreateForm({ clients, canSelectClient, onCreated }: { clients: Array<any>; canSelectClient: boolean; onCreated?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset, setValue, watch } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { role: 'user' } as any })
  const clientSel = watch('client_id')
  const roleSel = watch('role')
  const clientGroups = React.useMemo(()=>{
    const g: Record<string, any[]> = {}
    for (const c of clients||[]) { const k = String(c.name||'').charAt(0).toUpperCase() || '#'; (g[k] ||= []).push(c) }
    return Object.entries(g).sort(([a],[b])=>a.localeCompare(b))
  },[clients])
  const [serverError, setServerError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end" onSubmit={handleSubmit(async (values) => {
      setServerError(null)
      const body: any = { email: values.email, role: values.role }
      if (canSelectClient && values.client_id) body.client_id = values.client_id
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/clients/invite', method: 'POST', body }) })
      if (!r.ok) { try { const d = await r.json(); const msg = d?.error || d?.message || 'We couldn’t send the invite. Please try again.'; setServerError(msg); toastError(msg) } catch { const m='We couldn’t send the invite. Please try again.'; setServerError(m); toastError(m) } return }
      reset({ email: '', role: 'user', client_id: '' })
      success('Invite sent')
      onCreated?.()
    })}>
      <div>
        <label className="block text-sm text-muted-foreground">Email</label>
        <Input {...register('email')} type="email" placeholder="user@example.com" aria-invalid={!!errors.email} />
        {errors.email && <div className="text-sm text-red-600">{errors.email.message}</div>}
      </div>
      {canSelectClient && (
        <div>
          <label className="block text-sm text-muted-foreground">Client</label>
          <input type="hidden" {...register('client_id')} />
          <SearchableRSelect
            value={clientSel || ''}
            onValueChange={(v)=>setValue('client_id', v, { shouldValidate: true })}
            placeholder="Select client"
            items={[{value:'',label:'Select client'}, ...clients.map((c:any)=>({ value:c.id, label:`${c.name} (${c.code})` }))]}
          />
        </div>
      )}
      <div>
        <label className="block text-sm text-muted-foreground">Role</label>
        <input type="hidden" {...register('role')} />
        <RSelect value={roleSel || ''} onValueChange={(v)=>setValue('role', v, { shouldValidate: true })}>
          <RSelectTrigger className="w-full"><RSelectValue placeholder="user" /></RSelectTrigger>
          <RSelectContent>
            <RSelectItem value="user">user</RSelectItem>
            <RSelectItem value="client-admin">client-admin</RSelectItem>
            <RSelectItem value="client-user">client-user</RSelectItem>
          </RSelectContent>
        </RSelect>
      </div>
      <div>
        <Button type="submit" disabled={isSubmitting}>Send Invite</Button>
      </div>
      {serverError && <div className="text-sm text-red-600 md:col-span-4" role="alert">{serverError}</div>}
    </form>
  )
}
