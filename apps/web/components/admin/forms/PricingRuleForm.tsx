"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({
  scope: z.string().min(1,'Required'),
  org_id: z.string().optional(),
  role: z.string().optional(),
  user_id: z.string().optional(),
  provider: z.string().min(1,'Required'),
  model: z.string().min(1,'Required'),
  metric: z.string().min(1,'Required'),
  price_per_1k: z.coerce.number().min(0,'Must be >= 0'),
})
type Values = z.infer<typeof schema>

export default function PricingRuleForm({ onSaved }: { onSaved?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<Values>({ resolver: zodResolver(schema) })
  const [serverError, setServerError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end" onSubmit={handleSubmit(async (v) => {
      setServerError(null)
      const payload = { scope: v.scope, org_id: v.org_id || null, role: v.role || null, user_id: v.user_id || null, provider: v.provider, model: v.model, metric: v.metric, price_per_1k: v.price_per_1k, currency: 'USD', active: true }
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/pricing/rules', method: 'POST', body: payload }) })
      if (!r.ok) { try { const d=await r.json(); const msg = d?.error||d?.message||'Create failed'; setServerError(msg); toastError(msg) } catch { setServerError('Create failed'); toastError('Create failed') } return }
      reset({ scope: '', org_id: '', role: '', user_id: '', provider: '', model: '', metric: '', price_per_1k: 0 } as any)
      success('Pricing rule created')
      onSaved?.()
    })}>
      <div>
        <label className="block text-sm text-muted-foreground">Scope</label>
        <Input {...register('scope')} placeholder="default|org|role|user" aria-invalid={!!errors.scope} />
      </div>
      <div>
        <label className="block text-sm text-muted-foreground">Org ID</label>
        <Input {...register('org_id')} placeholder="org UUID (optional)" />
      </div>
      <div>
        <label className="block text-sm text-muted-foreground">Role</label>
        <Input {...register('role')} placeholder="Enterprise" />
      </div>
      <div>
        <label className="block text-sm text-muted-foreground">User ID</label>
        <Input {...register('user_id')} placeholder="alice" />
      </div>
      <div>
        <label className="block text-sm text-muted-foreground">Provider</label>
        <Input {...register('provider')} placeholder="bedrock|openai" aria-invalid={!!errors.provider} />
      </div>
      <div>
        <label className="block text-sm text-muted-foreground">Model</label>
        <Input {...register('model')} placeholder="model name" aria-invalid={!!errors.model} />
      </div>
      <div>
        <label className="block text-sm text-muted-foreground">Metric</label>
        <Input {...register('metric')} placeholder="input_tokens|output_tokens|embed_tokens" aria-invalid={!!errors.metric} />
      </div>
      <div>
        <label className="block text-sm text-muted-foreground">$/1k</label>
        <Input type="number" step="0.001" {...register('price_per_1k')} placeholder="0.200" aria-invalid={!!errors.price_per_1k} />
      </div>
      <div>
        <Button type="submit" disabled={isSubmitting}>Add Rule</Button>
      </div>
      {serverError && <div className="text-sm text-red-600 md:col-span-4" role="alert">{serverError}</div>}
    </form>
  )
}
