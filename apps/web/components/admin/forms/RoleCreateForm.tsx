"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({ name: z.string().min(1, 'Name is required'), description: z.string().optional() })
type Values = z.infer<typeof schema>

export default function RoleCreateForm({ onCreated }: { onCreated?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<Values>({ resolver: zodResolver(schema) })
  const [serverError, setServerError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end" onSubmit={handleSubmit(async (values) => {
      setServerError(null)
      const r = await fetch('/api/admin/proxy', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: '/roles', method: 'POST', body: values }),
      })
      if (!r.ok) {
        try { const data = await r.json(); const msg = data?.error || data?.message || 'Create role failed'; setServerError(msg); toastError(msg) } catch { setServerError('Create role failed'); toastError('Create role failed') }
        return
      }
      reset({ name: '', description: '' })
      success('Role created')
      onCreated?.()
    })}>
      <div>
        <label className="block text-sm text-muted-foreground">Name</label>
        <Input {...register('name')} placeholder="role name" aria-invalid={!!errors.name} />
        {errors.name && <div className="text-sm text-red-600">{errors.name.message}</div>}
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm text-muted-foreground">Description</label>
        <Input {...register('description')} placeholder="description" />
      </div>
      <div>
        <Button type="submit" disabled={isSubmitting}>Create</Button>
      </div>
      {serverError && <div className="text-sm text-red-600 md:col-span-4" role="alert">{serverError}</div>}
    </form>
  )
}
