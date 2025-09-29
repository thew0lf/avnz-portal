import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const schema = z.object({ name: z.string().min(1,'Name required'), level: z.coerce.number().positive('Level must be a positive integer') })
type Values = z.infer<typeof schema>

export default function AdminRoleCreateForm({ onCreated }: { onCreated?: () => void }){
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<Values>({ resolver: zodResolver(schema) })
  const [serverError, setServerError] = useState<string | null>(null)
  return (
    <form className="flex gap-2 items-end" onSubmit={handleSubmit(async (v)=>{
      setServerError(null)
      const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/admin/roles', method:'POST', body: v }) })
      if (!r.ok) { try { const d=await r.json(); setServerError(d?.error||d?.message||'Create failed') } catch { setServerError('Create failed') } return }
      reset({ name:'', level: 0 } as any)
      onCreated?.()
    })}>
      <div><label className="block text-sm text-muted-foreground">Name</label><Input {...register('name')} aria-invalid={!!errors.name} /></div>
      <div><label className="block text-sm text-muted-foreground">Level</label><Input type="number" {...register('level')} aria-invalid={!!errors.level} /></div>
      <Button type="submit" disabled={isSubmitting}>Create</Button>
      {serverError && <div className="text-sm text-red-600" role="alert">{serverError}</div>}
    </form>
  )
}