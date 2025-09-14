"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'
import { RSelect, RSelectTrigger, RSelectContent, RSelectItem, RSelectValue, RSelectGroup, RSelectLabel, RSelectSeparator } from '@/components/ui/rselect'
import SearchableRSelect from '@/components/ui/searchable-rselect'
import * as React from 'react'

const schema = z.object({ user_id: z.string().min(1, 'User is required'), node_id: z.string().min(1, 'Node is required'), role_id: z.string().min(1, 'Role is required') })
type Values = z.infer<typeof schema>

export default function AssignmentCreateForm({ onCreated, roleOptions }: { onCreated?: () => void; roleOptions?: Array<{ id: string; name: string }> }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset, setValue, watch } = useForm<Values>({ resolver: zodResolver(schema) })
  const roleValue = watch('role_id')
  const [serverError, setServerError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end" onSubmit={handleSubmit(async (values) => {
      setServerError(null)
      const r = await fetch('/api/admin/proxy', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: '/admin/assignments', method: 'POST', body: values }),
      })
      if (!r.ok) {
        try { const data = await r.json(); const msg = data?.error || data?.message || 'We couldn’t assign the role. Please try again.'; setServerError(msg); toastError(msg) } catch { const m='We couldn’t assign the role. Please try again.'; setServerError(m); toastError(m) }
        return
      }
      reset({ user_id: '', node_id: '', role_id: '' })
      success('Role assigned')
      onCreated?.()
    })}>
      <div><label className="block text-sm text-muted-foreground">User ID</label><Input {...register('user_id')} aria-invalid={!!errors.user_id} /></div>
      <div><label className="block text-sm text-muted-foreground">Node ID</label><Input {...register('node_id')} aria-invalid={!!errors.node_id} /></div>
      <div>
        <label className="block text-sm text-muted-foreground">Role</label>
        {roleOptions?.length ? (
          <>
            <input type="hidden" {...register('role_id')} />
            <SearchableRSelect
              value={roleValue || ''}
              onValueChange={(v)=>setValue('role_id', v, { shouldValidate: true })}
              placeholder="-- choose --"
              items={[{value:'',label:'-- choose --'}, ...roleOptions.map((r:any)=>({ value:r.id, label:r.name, group: `Level ${r.level ?? '—'}` }))]}
            />
          </>
        ) : <Input {...register('role_id')} aria-invalid={!!errors.role_id} />}
      </div>
      <Button type="submit" disabled={isSubmitting}>Assign</Button>
      {(errors.user_id || errors.node_id || errors.role_id) && <div className="text-sm text-red-600 md:col-span-4" role="alert">{errors.user_id?.message || errors.node_id?.message || errors.role_id?.message}</div>}
      {serverError && <div className="text-sm text-red-600 md:col-span-4" role="alert">{serverError}</div>}
    </form>
  )
}
