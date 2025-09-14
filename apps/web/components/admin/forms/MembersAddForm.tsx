"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { RSelect, RSelectTrigger, RSelectContent, RSelectItem, RSelectValue } from '@/components/ui/rselect'
import SearchableRSelect from '@/components/ui/searchable-rselect'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({
  identifier: z.string().min(1, 'Required'),
  role: z.string().optional(),
  role_id: z.string().optional(),
})
type Values = z.infer<typeof schema>

export default function MembersAddForm({ roles, onSaved }: { roles: Array<{ id: string; name: string }>; onSaved?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset, setValue, watch } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { role: 'user' } as any })
  const roleSel = watch('role_id')
  const [serverError, setServerError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end" onSubmit={handleSubmit(async (v) => {
      setServerError(null)
      const body: any = { identifier: v.identifier }
      if (v.role) body.role = v.role
      if (v.role_id) body.role_id = v.role_id
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/memberships', method: 'POST', body }) })
      if (!r.ok) { try { const d=await r.json(); const msg = d?.error||d?.message||'We couldn’t save your changes. Please try again.'; setServerError(msg); toastError(msg) } catch { const m='We couldn’t save your changes. Please try again.'; setServerError(m); toastError(m) } return }
      reset({ identifier: '', role: 'user', role_id: '' })
      success('Member added/updated')
      onSaved?.()
    })}>
      <div>
        <label className="block text-sm text-muted-foreground">Email or Username</label>
        <Input {...register('identifier')} placeholder="user@example.com or username" aria-invalid={!!errors.identifier} />
        {errors.identifier && <div className="text-sm text-red-600">{errors.identifier.message}</div>}
      </div>
      <div>
        <label className="block text-sm text-muted-foreground">Role</label>
        <Input {...register('role')} placeholder="user|org|admin" defaultValue="user" />
      </div>
      <div>
        <label className="block text-sm text-muted-foreground">Role (select)</label>
        <input type="hidden" {...register('role_id')} />
        <SearchableRSelect
          value={roleSel || ''}
          onValueChange={(v)=>setValue('role_id', v, { shouldValidate: true })}
          placeholder="-- optional --"
          items={[{value:'',label:'-- optional --'}, ...roles.map((r:any)=>({ value:r.id, label:r.name, group: `Level ${r.level ?? '—'}` }))]}
        />
      </div>
      <div>
        <Button type="submit" disabled={isSubmitting}>Add / Update</Button>
      </div>
      {serverError && <div className="text-sm text-red-600 md:col-span-5" role="alert">{serverError}</div>}
    </form>
  )
}
