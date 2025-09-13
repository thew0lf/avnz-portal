"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({ identifier: z.string().min(1, 'Required') })
type Values = z.infer<typeof schema>

export default function UpdateManagerForm({ clientId, onSaved }: { clientId: string; onSaved?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<Values>({ resolver: zodResolver(schema) })
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="flex gap-2" onSubmit={handleSubmit(async (values) => {
      setServerError(null)
      setSaved(false)
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: `/clients/${clientId}/manager`, method: 'POST', body: { identifier: values.identifier } }) })
      if (!r.ok) { try { const d=await r.json(); const msg = d?.error||d?.message||'Save failed'; setServerError(msg); toastError(msg) } catch { setServerError('Save failed'); toastError('Save failed') } return }
      setSaved(true)
      reset({ identifier: '' })
      success('Manager updated')
      onSaved?.()
    })}>
      <Input {...register('identifier')} placeholder="user@example.com or username" aria-invalid={!!errors.identifier} />
      <Button type="submit" variant="outline" disabled={isSubmitting}>Save</Button>
      {errors.identifier && <div className="text-sm text-red-600">{errors.identifier.message}</div>}
      {serverError && <div className="text-sm text-red-600" role="alert">{serverError}</div>}
      {saved && <div className="text-sm text-green-600" role="status">Saved</div>}
    </form>
  )
}
