"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({ role_id: z.string().min(1, 'Choose a role') })
type Values = z.infer<typeof schema>

export default function SetMemberRoleForm({ identifier, roles, onSaved }: { identifier: string; roles: Array<{ id: string; name: string }>; onSaved?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { role_id: '' } as any })
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="flex gap-2 items-center" onSubmit={handleSubmit(async (v) => {
      setServerError(null)
      setSaved(false)
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/memberships', method: 'POST', body: { identifier, role_id: v.role_id } }) })
      if (!r.ok) { try { const d=await r.json(); const msg = d?.error||d?.message||'Save failed'; setServerError(msg); toastError(msg) } catch { setServerError('Save failed'); toastError('Save failed') } return }
      setSaved(true)
      success('Member role saved')
      reset({ role_id: '' })
      onSaved?.()
    })}>
      <Select {...register('role_id')} defaultValue="">
        <option value="">-- choose --</option>
        {roles.map((x:any)=>(<option key={x.id} value={x.id}>{x.name}</option>))}
      </Select>
      <Button type="submit" variant="outline" disabled={isSubmitting}>Save</Button>
      {errors.role_id && <div className="text-sm text-red-600">{errors.role_id.message}</div>}
      {serverError && <div className="text-sm text-red-600" role="alert">{serverError}</div>}
      {saved && <div className="text-sm text-green-600" role="status">Saved</div>}
    </form>
  )
}
