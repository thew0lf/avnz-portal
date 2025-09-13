"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({ action_name: z.string().min(1,'Action required'), expr: z.string().min(2,'Expr required') })
type Values = z.infer<typeof schema>

export default function AbacFenceForm({ onCreated }: { onCreated?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<Values>({ resolver: zodResolver(schema) })
  const [serverError, setServerError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end" onSubmit={handleSubmit(async (v) => {
      setServerError(null)
      let parsed: any
      try { parsed = JSON.parse(v.expr) } catch { setServerError('Expression must be valid JSON'); return }
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/admin/abac', method: 'POST', body: { action_name: v.action_name, expr: parsed } }) })
      if (!r.ok) { try { const d=await r.json(); const msg = d?.error||d?.message||'Create failed'; setServerError(msg); toastError(msg) } catch { setServerError('Create failed'); toastError('Create failed') } return }
      reset({ action_name: '', expr: '' })
      success('Fence created')
      onCreated?.()
    })}>
      <div><label className="block text-sm text-muted-foreground">Action</label><Input {...register('action_name')} placeholder="view_student_pii" aria-invalid={!!errors.action_name} /></div>
      <div className="md:col-span-2"><label className="block text-sm text-muted-foreground">JSONLogic Expr</label><Input {...register('expr')} placeholder='{"==":[{"var":"req.pupilData"},true]}' aria-invalid={!!errors.expr} /></div>
      <Button type="submit" disabled={isSubmitting} className="md:col-span-3">Create</Button>
      {serverError && <div className="text-sm text-red-600 md:col-span-3" role="alert">{serverError}</div>}
    </form>
  )
}
