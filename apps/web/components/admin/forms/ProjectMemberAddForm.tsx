"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { RSelect, RSelectTrigger, RSelectContent, RSelectItem, RSelectValue } from '@/components/ui/rselect'
import SearchableRSelect from '@/components/ui/searchable-rselect'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({
  project_code: z.string().min(1, 'Project required'),
  identifier: z.string().min(1, 'Identifier required'),
  role: z.string().optional(),
  role_id: z.string().optional(),
})
type Values = z.infer<typeof schema>

export default function ProjectMemberAddForm({ projectCode, roles, onSaved }: { projectCode: string; roles: Array<{ id: string; name: string }>; onSaved?: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset, setValue, watch } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { project_code: projectCode, role: 'contributor' } as any })
  const roleSel = watch('role_id')
  const [serverError, setServerError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  return (
    <form method="post" className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end" onSubmit={handleSubmit(async (v) => {
      setServerError(null)
      const body: any = { projectCode: v.project_code, identifier: v.identifier }
      if (v.role) body.role = v.role
      if (v.role_id) body.role_id = v.role_id
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/project-members', method: 'POST', body }) })
      if (!r.ok) { try { const d=await r.json(); const msg = d?.error||d?.message||'We couldn’t save your changes. Please try again.'; setServerError(msg); toastError(msg) } catch { const m='We couldn’t save your changes. Please try again.'; setServerError(m); toastError(m) } return }
      reset({ project_code: projectCode, identifier: '', role: 'contributor', role_id: '' })
      success('Project member added/updated')
      onSaved?.()
    })}>
      <input type="hidden" value={projectCode} {...register('project_code')} />
      <div>
        <label className="block text-sm text-muted-foreground">Email or Username</label>
        <Input {...register('identifier')} placeholder="user@example.com or username" aria-invalid={!!errors.identifier} />
      </div>
      <div>
        <label className="block text-sm text-muted-foreground">Role</label>
        <Input {...register('role')} placeholder="contributor|viewer|admin" defaultValue="contributor" />
      </div>
      <div>
        <label className="block text-sm text-muted-foreground">Role (select)</label>
        <input type="hidden" {...register('role_id')} />
        <SearchableRSelect
          value={roleSel || ''}
          onValueChange={(v)=>setValue('role_id', v, { shouldValidate: true })}
          placeholder="-- optional --"
          items={[{value:'',label:'-- optional --'}, ...roles.map((r:any)=>({ value:r.id, label:r.name, group: `Level ${r.level ?? '—'}` }))]}
        />
      </div>
      <div>
        <Button type="submit" disabled={isSubmitting}>Add / Update</Button>
      </div>
      {serverError && <div className="text-sm text-red-600 md:col-span-5" role="alert">{serverError}</div>}
    </form>
  )
}
