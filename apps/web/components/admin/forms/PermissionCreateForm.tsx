"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  resource_type: z.string().min(1, 'Resource is required'),
  action_name: z.string().min(1, 'Action is required'),
  min_role_id: z.string().min(1, 'Min role is required'),
})
type Values = z.infer<typeof schema>

export default function PermissionCreateForm({
  defaultDomain = 'node',
  onCreated,
}: { defaultDomain?: string; onCreated?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { domain: defaultDomain } as any })
  const [serverError, setServerError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end" onSubmit={handleSubmit(async (values) => {
      setServerError(null)
      const r = await fetch('/api/admin/proxy', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: '/admin/permissions', method: 'POST', body: values }),
      })
      if (!r.ok) {
        try { const data = await r.json(); const msg = data?.error || data?.message || 'We couldn’t save the permission. Please try again.'; setServerError(msg); toastError(msg) } catch { const m='We couldn’t save the permission. Please try again.'; setServerError(m); toastError(m) }
        return
      }
      reset({ domain: defaultDomain, resource_type: '', action_name: '', min_role_id: '' })
      success('Permission saved')
      onCreated?.()
    })}>
      <div><label className="block text-sm text-muted-foreground">Domain</label><Input {...register('domain')} aria-invalid={!!errors.domain} /></div>
      <div><label className="block text-sm text-muted-foreground">Resource</label><Input {...register('resource_type')} aria-invalid={!!errors.resource_type} /></div>
      <div><label className="block text-sm text-muted-foreground">Action</label><Input {...register('action_name')} aria-invalid={!!errors.action_name} /></div>
      <div><label className="block text-sm text-muted-foreground">Min Role ID</label><Input {...register('min_role_id')} aria-invalid={!!errors.min_role_id} /></div>
      <Button type="submit" disabled={isSubmitting}>Upsert</Button>
      {(errors.domain || errors.resource_type || errors.action_name || errors.min_role_id) && (
        <div className="text-sm text-red-600 md:col-span-5" role="alert">
          {errors.domain?.message || errors.resource_type?.message || errors.action_name?.message || errors.min_role_id?.message}
        </div>
      )}
      {serverError && <div className="text-sm text-red-600 md:col-span-5" role="alert">{serverError}</div>}
    </form>
  )
}
