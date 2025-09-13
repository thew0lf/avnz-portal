"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({
  email: z.string().email('Valid email required'),
  role: z.string().min(1, 'Role is required'),
  client_id: z.string().optional(),
})
type Values = z.infer<typeof schema>

export default function InviteCreateForm({ clients, canSelectClient, onCreated }: { clients: Array<any>; canSelectClient: boolean; onCreated?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { role: 'user' } as any })
  const [serverError, setServerError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end" onSubmit={handleSubmit(async (values) => {
      setServerError(null)
      const body: any = { email: values.email, role: values.role }
      if (canSelectClient && values.client_id) body.client_id = values.client_id
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/clients/invite', method: 'POST', body }) })
      if (!r.ok) { try { const d = await r.json(); const msg = d?.error || d?.message || 'Send invite failed'; setServerError(msg); toastError(msg) } catch { setServerError('Send invite failed'); toastError('Send invite failed') } return }
      reset({ email: '', role: 'user', client_id: '' })
      success('Invite sent')
      onCreated?.()
    })}>
      <div>
        <label className="block text-sm text-muted-foreground">Email</label>
        <Input {...register('email')} type="email" placeholder="user@example.com" aria-invalid={!!errors.email} />
        {errors.email && <div className="text-sm text-red-600">{errors.email.message}</div>}
      </div>
      {canSelectClient && (
        <div>
          <label className="block text-sm text-muted-foreground">Client</label>
          <Select {...register('client_id')}>
            <option value="">Select client</option>
            {clients.map((c:any)=>(<option key={c.id} value={c.id}>{c.name} ({c.code})</option>))}
          </Select>
        </div>
      )}
      <div>
        <label className="block text-sm text-muted-foreground">Role</label>
        <Select {...register('role')} defaultValue="user">
          <option value="user">user</option>
          <option value="client-admin">client-admin</option>
          <option value="client-user">client-user</option>
        </Select>
      </div>
      <div>
        <Button type="submit" disabled={isSubmitting}>Send Invite</Button>
      </div>
      {serverError && <div className="text-sm text-red-600 md:col-span-4" role="alert">{serverError}</div>}
    </form>
  )
}
