"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({ name: z.string().min(1, 'Name required') })
type Values = z.infer<typeof schema>

export default function ActionCreateForm({ onCreated }: { onCreated?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<Values>({ resolver: zodResolver(schema) })
  const [serverError, setServerError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="flex gap-2 items-end" onSubmit={handleSubmit(async (v) => {
      setServerError(null)
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/admin/actions', method: 'POST', body: { name: v.name } }) })
      if (!r.ok) { try { const d=await r.json(); const msg = d?.error||d?.message||'We couldn’t complete this action. Please try again.'; setServerError(msg); toastError(msg) } catch { const m='We couldn’t complete this action. Please try again.'; setServerError(m); toastError(m) } return }
      reset({ name: '' })
      success('Action created')
      onCreated?.()
    })}>
      <div><label className="block text-sm text-muted-foreground">Name</label><Input {...register('name')} aria-invalid={!!errors.name} /></div>
      <Button type="submit" disabled={isSubmitting}>Create</Button>
      {serverError && <div className="text-sm text-red-600" role="alert">{serverError}</div>}
    </form>
  )
}
