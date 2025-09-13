"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  client_code: z.string().optional(),
})
type Values = z.infer<typeof schema>

export default function ProjectCreateForm({ onCreated }: { onCreated?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<Values>({ resolver: zodResolver(schema) })
  const [serverError, setServerError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end" onSubmit={handleSubmit(async (values) => {
      setServerError(null)
      const body: any = { name: values.name }
      if (values.code) body.code = values.code
      if (values.client_code) body.client_code = values.client_code
      const r = await fetch('/api/admin/proxy', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: '/projects', method: 'POST', body }),
      })
      if (!r.ok) {
        try { const data = await r.json(); const msg = data?.error || data?.message || 'Create project failed'; setServerError(msg); toastError(msg) } catch { setServerError('Create project failed'); toastError('Create project failed') }
        return
      }
      reset({ name: '', code: '', client_code: '' })
      success('Project created')
      onCreated?.()
    })}>
      <div>
        <label className="block text-sm text-muted-foreground">Name</label>
        <Input {...register('name')} placeholder="New project" aria-invalid={!!errors.name} />
        {errors.name && <div className="text-sm text-red-600">{errors.name.message}</div>}
      </div>
      <div>
        <label className="block text-sm text-muted-foreground">Code (optional)</label>
        <Input {...register('code')} placeholder="short-code" />
      </div>
      <div>
        <label className="block text-sm text-muted-foreground">Client Code (optional)</label>
        <Input {...register('client_code')} placeholder="client short code" />
      </div>
      <div>
        <Button type="submit" disabled={isSubmitting}>Create</Button>
      </div>
      {serverError && <div className="text-sm text-red-600 md:col-span-4" role="alert">{serverError}</div>}
    </form>
  )
}
