"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const schema = z.object({ identifier: z.string().min(1, 'Required') })
type Values = z.infer<typeof schema>

export default function RoleAssignForm({ roleId, onSaved }: { roleId: string; onSaved?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<Values>({ resolver: zodResolver(schema) })
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  return (
    <form className="flex gap-2 items-end mt-2" onSubmit={handleSubmit(async (v) => {
      setServerError(null); setSaved(false)
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: `/roles/${encodeURIComponent(roleId)}/assign`, method: 'POST', body: { identifier: v.identifier } }) })
      if (!r.ok) { try { const d=await r.json(); setServerError(d?.error||d?.message||'Assign failed') } catch { setServerError('Assign failed') } return }
      setSaved(true)
      reset({ identifier: '' })
      onSaved?.()
    })}>
      <div className="grow">
        <label className="block text-sm text-muted-foreground">Assign to user (email/username)</label>
        <Input {...register('identifier')} placeholder="user@example.com or username" aria-invalid={!!errors.identifier} />
      </div>
      <Button type="submit" variant="outline" disabled={isSubmitting}>Assign</Button>
      {errors.identifier && <div className="text-sm text-red-600">{errors.identifier.message}</div>}
      {serverError && <div className="text-sm text-red-600" role="alert">{serverError}</div>}
      {saved && <div className="text-sm text-green-600" role="status">Assigned</div>}
    </form>
  )
}

