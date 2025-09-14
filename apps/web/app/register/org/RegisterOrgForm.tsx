"use client"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RHFProvider, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({
  org_code: z.string().min(1,'Org code is required'),
  org_name: z.string().min(1,'Org name is required'),
  email: z.string().email('Valid email required'),
  username: z.string().optional(),
  password: z.string().min(12,'Password must be at least 12 characters')
    .regex(/[A-Z]/,'Must include uppercase')
    .regex(/[a-z]/,'Must include lowercase')
    .regex(/[0-9]/,'Must include a digit')
    .regex(/[^A-Za-z0-9]/,'Must include a symbol')
})

export default function RegisterOrgForm({ csrf }: { csrf: string }){
  const methods = useForm({ resolver: zodResolver(schema), mode:'onSubmit' })
  const { control, handleSubmit, formState:{ isSubmitting } } = methods
  const router = useRouter()
  const [serverError, setServerError] = useState<string| null>(null)
  const { success, error: toastError } = useToast()
  return (
    <RHFProvider methods={methods}>
      <form method="post" className="space-y-3" onSubmit={handleSubmit(async (values:any)=>{
        setServerError(null)
        const fd = new FormData()
        fd.set('csrf', csrf)
        fd.set('org_code', values.org_code)
        fd.set('org_name', values.org_name)
        fd.set('email', values.email)
        if (values.username) fd.set('username', values.username)
        fd.set('password', values.password)
        const r = await fetch('/api/register/org', { method: 'POST', body: fd, credentials: 'same-origin' })
        if (r.ok) { success('Organization created'); router.push('/admin'); return }
        try { const data = await r.json(); const msg = data?.message || data?.error || 'We couldn’t complete registration right now. Please try again or contact support.'; setServerError(msg); toastError(msg) } catch { const msg='We couldn’t complete registration right now. Please try again or contact support.'; setServerError(msg); toastError(msg) }
      })}>
        <FormField name="org_code" control={control} render={({ field }: any)=> (
          <FormItem><FormLabel htmlFor="org_code">Org Code</FormLabel><FormControl><Input id="org_code" placeholder="acme" {...field} /></FormControl><FormMessage name="org_code" /></FormItem>
        )} />
        <FormField name="org_name" control={control} render={({ field }: any)=> (
          <FormItem><FormLabel htmlFor="org_name">Org Name</FormLabel><FormControl><Input id="org_name" placeholder="Acme Corp" {...field} /></FormControl><FormMessage name="org_name" /></FormItem>
        )} />
        <FormField name="email" control={control} render={({ field }: any)=> (
          <FormItem><FormLabel htmlFor="email">Admin Email</FormLabel><FormControl><Input id="email" type="email" {...field} /></FormControl><FormMessage name="email" /></FormItem>
        )} />
        <FormField name="username" control={control} render={({ field }: any)=> (
          <FormItem><FormLabel htmlFor="username">Admin Username (optional)</FormLabel><FormControl><Input id="username" {...field} /></FormControl><FormMessage name="username" /></FormItem>
        )} />
        <FormField name="password" control={control} render={({ field }: any)=> (
          <FormItem><FormLabel htmlFor="password">Password</FormLabel><FormControl><Input id="password" type="password" {...field} /></FormControl><FormMessage name="password" /></FormItem>
        )} />
        {serverError && <div className="text-sm text-red-600" role="alert">{serverError}</div>}
        <Button disabled={isSubmitting} type="submit" className="w-full">Create Org</Button>
      </form>
    </RHFProvider>
  )
}
