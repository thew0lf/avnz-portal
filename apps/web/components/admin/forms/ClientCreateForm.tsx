"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({ name: z.string().min(1, 'Name is required') })
type Values = z.infer<typeof schema>

export default function ClientCreateForm({ onCreated }: { onCreated?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<Values>({ resolver: zodResolver(schema) })
  const [serverError, setServerError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="flex gap-2 items-end" onSubmit={handleSubmit(async (values) => {
      setServerError(null)
      const r = await fetch('/api/admin/proxy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: '/clients/register', method: 'POST', body: { name: values.name } }),
      })
      if (!r.ok) {
        try { const data = await r.json(); const msg = data?.error || data?.message || 'We couldn’t create the client. Please try again or contact support.'; setServerError(msg); toastError(msg) } catch { const m='We couldn’t create the client. Please try again or contact support.'; setServerError(m); toastError(m) }
        return
      }
      reset({ name: '' })
      success('Client created')
      onCreated?.()
    })}>
      <div>
        <label className="block text-sm text-muted-foreground">Name</label>
        <Input {...register('name')} placeholder="New client name" aria-invalid={!!errors.name} />
        {errors.name && <div className="text-sm text-red-600">{errors.name.message}</div>}
      </div>
      <Button type="submit" disabled={isSubmitting}>Create</Button>
      {serverError && <div className="text-sm text-red-600 ml-2" role="alert">{serverError}</div>}
    </form>
  )
}
