"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({ user_id: z.string().min(1, 'User is required'), node_id: z.string().min(1, 'Node is required'), role_id: z.string().min(1, 'Role is required') })
type Values = z.infer<typeof schema>

export default function AssignmentCreateForm({ onCreated, roleOptions }: { onCreated?: () => void; roleOptions?: Array<{ id: string; name: string }> }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<Values>({ resolver: zodResolver(schema) })
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
        try { const data = await r.json(); const msg = data?.error || data?.message || 'Assign role failed'; setServerError(msg); toastError(msg) } catch { setServerError('Assign role failed'); toastError('Assign role failed') }
        return
      }
      reset({ user_id: '', node_id: '', role_id: '' })
      success('Role assigned')
      onCreated?.()
    })}>
      <div><label className="block text-sm text-muted-foreground">User ID</label><Input {...register('user_id')} aria-invalid={!!errors.user_id} /></div>
      <div><label className="block text-sm text-muted-foreground">Node ID</label><Input {...register('node_id')} aria-invalid={!!errors.node_id} /></div>
      <div>
        <label className="block text-sm text-muted-foreground">Role ID</label>
        {roleOptions?.length ? (
          <select className="border rounded h-9 px-2 w-full" {...register('role_id')} aria-invalid={!!errors.role_id}>
            <option value="">-- choose --</option>
            {roleOptions.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
          </select>
        ) : <Input {...register('role_id')} aria-invalid={!!errors.role_id} />}
      </div>
      <Button type="submit" disabled={isSubmitting}>Assign</Button>
      {(errors.user_id || errors.node_id || errors.role_id) && <div className="text-sm text-red-600 md:col-span-4" role="alert">{errors.user_id?.message || errors.node_id?.message || errors.role_id?.message}</div>}
      {serverError && <div className="text-sm text-red-600 md:col-span-4" role="alert">{serverError}</div>}
    </form>
  )
}
