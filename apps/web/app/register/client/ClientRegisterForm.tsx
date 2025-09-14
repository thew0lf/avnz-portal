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

const schema = z.object({ name: z.string().min(1,'Client name is required') })

export default function ClientRegisterForm({ csrf }: { csrf: string }){
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
        fd.set('name', values.name)
        const r = await fetch('/api/register/client', { method:'POST', body: fd, credentials: 'same-origin' })
        if (r.ok) { success('Client created'); router.push('/admin/clients'); return }
        try { const data = await r.json(); const msg = data?.message || data?.error || 'We couldn’t create the client. Please try again or contact support.'; setServerError(msg); toastError(msg) } catch { const msg = 'We couldn’t create the client. Please try again or contact support.'; setServerError(msg); toastError(msg) }
      })}>
        <FormField name="name" control={control} render={({ field }: any)=> (
          <FormItem><FormLabel htmlFor="name">Client Name</FormLabel><FormControl><Input id="name" placeholder="Customer Co." {...field} /></FormControl><FormMessage name="name" /></FormItem>
        )} />
        {serverError && <div className="text-sm text-red-600" role="alert">{serverError}</div>}
        <Button disabled={isSubmitting} type="submit" className="w-full">Create Client</Button>
      </form>
    </RHFProvider>
  )
}
