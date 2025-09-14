"use client"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form as UIForm, RHFProvider, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/toast-provider'

const schema = z.object({
  client_code: z.string().min(1, 'Client code is required'),
  email: z.string().min(1, 'Email or username is required'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must include uppercase')
    .regex(/[a-z]/, 'Must include lowercase')
    .regex(/[0-9]/, 'Must include a digit')
    .regex(/[^A-Za-z0-9]/, 'Must include a symbol'),
})

export default function LoginForm({ defaultValues, nextPath, csrf, flash }: { defaultValues: any; nextPath: string; csrf: string; flash?: string }){
  const methods = useForm({ resolver: zodResolver(schema), mode: 'onSubmit', defaultValues })
  const { handleSubmit, control, formState: { isSubmitting } } = methods
  const router = useRouter()
  const [serverError, setServerError] = useState<string| null>(null)
  const { success, error: toastError } = useToast()
  useEffect(()=>{
    if (flash === 'reset-sent') {
      success("If an account exists, we've sent a reset link")
    }
  }, [flash, success])
  return (
    <RHFProvider methods={methods}>
      <UIForm className="space-y-4" onSubmit={handleSubmit(async (values:any)=>{
        setServerError(null)
        const fd = new FormData()
        fd.set('csrf', csrf)
        fd.set('client_code', values.client_code)
        fd.set('email', values.email)
        fd.set('password', values.password)
        fd.set('next', nextPath)
        const r = await fetch('/api/login', { method: 'POST', body: fd, credentials: 'same-origin' })
        if (r.ok) { success('Signed in'); router.push(nextPath || '/admin'); return }
        try { const data = await r.json(); const msg = data?.message || data?.error || 'We couldn’t sign you in. Please check your details and try again.'; setServerError(msg); toastError(msg) } catch { const msg = 'We couldn’t sign you in. Please check your details and try again.'; setServerError(msg); toastError(msg) }
      })}>
        <FormField name="client_code" control={control} render={({ field }: any) => (
          <FormItem>
            <FormLabel htmlFor="client_code">Client Code</FormLabel>
            <FormControl>
              <Input id="client_code" placeholder="your client short code" {...field} aria-invalid={!!methods.formState.errors.client_code} />
            </FormControl>
            <FormMessage name="client_code" />
          </FormItem>
        )} />
        <FormField name="email" control={control} render={({ field }: any) => (
          <FormItem>
            <FormLabel htmlFor="email">Email or Username</FormLabel>
            <FormControl>
              <Input id="email" {...field} placeholder="you@example.com" aria-invalid={!!methods.formState.errors.email} />
            </FormControl>
            <FormMessage name="email" />
          </FormItem>
        )} />
        <FormField name="password" control={control} render={({ field }: any) => (
          <FormItem>
            <FormLabel htmlFor="password">Password</FormLabel>
            <FormControl>
              <Input id="password" type="password" {...field} placeholder="••••••••••" aria-invalid={!!methods.formState.errors.password} />
            </FormControl>
            <FormMessage name="password" />
          </FormItem>
        )} />
        {serverError && <div className="text-sm text-red-600" role="alert">{serverError}</div>}
        <Button disabled={isSubmitting} type="submit" className="w-full">Sign in</Button>
      </UIForm>
    </RHFProvider>
  )
}
