"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { RSelect, RSelectTrigger, RSelectContent, RSelectItem, RSelectValue } from '@/components/ui/rselect'
import SearchableRSelect from '@/components/ui/searchable-rselect'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({ role_id: z.string().min(1, 'Choose a role') })
type Values = z.infer<typeof schema>

export default function SetMemberRoleForm({ identifier, roles, onSaved }: { identifier: string; roles: Array<{ id: string; name: string }>; onSaved?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset, setValue, watch } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { role_id: '' } as any })
  const roleValue = watch('role_id')
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="flex gap-2 items-center" onSubmit={handleSubmit(async (v) => {
      setServerError(null)
      setSaved(false)
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/memberships', method: 'POST', body: { identifier, role_id: v.role_id } }) })
      if (!r.ok) { try { const d=await r.json(); const msg = d?.error||d?.message||'We couldn’t save your changes. Please try again.'; setServerError(msg); toastError(msg) } catch { const m='We couldn’t save your changes. Please try again.'; setServerError(m); toastError(m) } return }
      setSaved(true)
      success('Member role saved')
      reset({ role_id: '' })
      onSaved?.()
    })}>
      <input type="hidden" {...register('role_id')} />
      <SearchableRSelect
        value={roleValue || ''}
        onValueChange={(v)=>setValue('role_id', v, { shouldValidate: true })}
        placeholder="-- choose --"
        items={[{value:'',label:'-- choose --'}, ...roles.map((x:any)=>({ value:x.id, label:x.name, group: `Level ${x.level ?? '—'}` }))]}
      />
      <Button type="submit" variant="outline" disabled={isSubmitting}>Save</Button>
      {errors.role_id && <div className="text-sm text-red-600">{errors.role_id.message}</div>}
      {serverError && <div className="text-sm text-red-600" role="alert">{serverError}</div>}
      {saved && <div className="text-sm text-green-600" role="status">Saved</div>}
    </form>
  )
}
