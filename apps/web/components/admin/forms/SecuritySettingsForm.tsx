"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({
  require_mfa: z.boolean().optional(),
  minLength: z.coerce.number().min(8, 'Min 8'),
  requireUpper: z.boolean().optional(),
  requireLower: z.boolean().optional(),
  requireDigit: z.boolean().optional(),
  requireSymbol: z.boolean().optional(),
  audit_retention_days: z.coerce.number().min(1, 'Min 1'),
})
type Values = z.infer<typeof schema>

export default function SecuritySettingsForm({ defaults }: { defaults: Partial<Values> & { password_policy?: any } }) {
  const policy = defaults?.password_policy || {}
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    require_mfa: !!defaults?.require_mfa,
    minLength: Number(policy.minLength || 12),
    requireUpper: policy.requireUpper !== false,
    requireLower: policy.requireLower !== false,
    requireDigit: policy.requireDigit !== false,
    requireSymbol: policy.requireSymbol !== false,
    audit_retention_days: Number(defaults?.audit_retention_days || 365),
  } as any })
  const [serverError, setServerError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  const [saved, setSaved] = useState(false)
  return (
    <form method="post" className="grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={handleSubmit(async (v) => {
      setServerError(null)
      setSaved(false)
      const body = {
        require_mfa: !!v.require_mfa,
        password_policy: { minLength: v.minLength, requireUpper: !!v.requireUpper, requireLower: !!v.requireLower, requireDigit: !!v.requireDigit, requireSymbol: !!v.requireSymbol },
        audit_retention_days: v.audit_retention_days,
      }
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/admin/security-settings', method: 'PATCH', body }) })
      if (!r.ok) { try { const d = await r.json(); const msg = d?.error || d?.message || 'Save failed'; setServerError(msg); toastError(msg) } catch { setServerError('Save failed'); toastError('Save failed') } return }
      setSaved(true)
      success('Settings saved')
    })}>
      <label className="flex items-center gap-2 md:col-span-3"><input type="checkbox" {...register('require_mfa')} /> Require MFA</label>
      <div><label className="block text-sm text-muted-foreground">Min Length</label><Input type="number" {...register('minLength')} aria-invalid={!!errors.minLength} /></div>
      <label className="flex items-center gap-2"><input type="checkbox" {...register('requireUpper')} /> Uppercase</label>
      <label className="flex items-center gap-2"><input type="checkbox" {...register('requireLower')} /> Lowercase</label>
      <label className="flex items-center gap-2"><input type="checkbox" {...register('requireDigit')} /> Digit</label>
      <label className="flex items-center gap-2"><input type="checkbox" {...register('requireSymbol')} /> Symbol</label>
      <div className="md:col-span-3"><label className="block text-sm text-muted-foreground">Audit Retention (days)</label><Input type="number" {...register('audit_retention_days')} aria-invalid={!!errors.audit_retention_days} /></div>
      <Button type="submit" disabled={isSubmitting} className="md:col-span-3">Save</Button>
      {serverError && <div className="text-sm text-red-600 md:col-span-3" role="alert">{serverError}</div>}
      {saved && <div className="text-sm text-green-600 md:col-span-3" role="status">Saved</div>}
    </form>
  )
}
