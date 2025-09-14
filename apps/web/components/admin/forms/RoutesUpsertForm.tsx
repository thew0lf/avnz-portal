"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({
  method: z.string().min(1, 'Method required'),
  path: z.string().min(1, 'Path required'),
  domain: z.string().min(1, 'Domain required'),
  resource_type: z.string().min(1, 'Resource required'),
  action_name: z.string().min(1, 'Action required'),
  resource_param: z.string().optional(),
})
type Values = z.infer<typeof schema>

export default function RoutesUpsertForm({ onSaved }: { onSaved?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { domain: 'node' } as any })
  const [serverError, setServerError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end" onSubmit={handleSubmit(async (v) => {
      setServerError(null)
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/admin/routes', method: 'POST', body: v }) })
      if (!r.ok) { try { const d=await r.json(); const msg = d?.error||d?.message||'We couldn’t save your changes. Please try again.'; setServerError(msg); toastError(msg) } catch { const m='We couldn’t save your changes. Please try again.'; setServerError(m); toastError(m) } return }
      reset({ method: '', path: '', domain: 'node', resource_type: '', action_name: '', resource_param: '' })
      success('Route saved')
      onSaved?.()
    })}>
      <div><label className="block text-sm text-muted-foreground">Method</label><Input {...register('method')} placeholder="GET|POST|..." aria-invalid={!!errors.method} /></div>
      <div><label className="block text-sm text-muted-foreground">Path</label><Input {...register('path')} placeholder="/nodes/:id" aria-invalid={!!errors.path} /></div>
      <div><label className="block text-sm text-muted-foreground">Domain</label><Input {...register('domain')} defaultValue="node" aria-invalid={!!errors.domain} /></div>
      <div><label className="block text-sm text-muted-foreground">Resource</label><Input {...register('resource_type')} aria-invalid={!!errors.resource_type} /></div>
      <div><label className="block text-sm text-muted-foreground">Action</label><Input {...register('action_name')} aria-invalid={!!errors.action_name} /></div>
      <div><label className="block text-sm text-muted-foreground">Resource Param</label><Input {...register('resource_param')} /></div>
      <Button type="submit" disabled={isSubmitting} className="md:col-span-6">Upsert</Button>
      {serverError && <div className="text-sm text-red-600 md:col-span-6" role="alert">{serverError}</div>}
    </form>
  )
}
