"use client"
import { useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { RHFProvider, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast-provider'

export default function AcceptInvitePage() {
  const sp = useSearchParams()
  const token = sp.get('token') || ''
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { success, error: toastError } = useToast()
  const schema = z.object({
    username: z.string().optional(),
    password: z.string().min(12,'Password must be at least 12 characters').regex(/[A-Z]/,'Must include uppercase').regex(/[a-z]/,'Must include lowercase').regex(/[0-9]/,'Must include a digit').regex(/[^A-Za-z0-9]/,'Must include a symbol')
  })
  const methods = useForm({ resolver: zodResolver(schema), mode:'onSubmit' })
  const { control, handleSubmit, formState:{ isSubmitting } } = methods
  async function onSubmit() {
    setError(null)
    setSubmitting(true)
    const form = new FormData(document.getElementById('accept-form') as HTMLFormElement)
    const r = await fetch('/api/auth/accept-invite', { method: 'POST', body: form })
    if (!r.ok) {
      const data = await r.json().catch(()=>({ error: 'Failed to accept invite' }))
      const msg = data?.message || data?.error || 'Failed to accept invite'
      setError(msg)
      toastError(msg)
      setSubmitting(false)
      return
    }
    // redirect handled by route
    success('Invitation accepted')
    setSubmitting(false)
  }
  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>Set your password to finish account setup.</CardDescription>
        </CardHeader>
        <CardContent>
          <RHFProvider methods={methods}>
          <form id="accept-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" method="post" action="/api/auth/accept-invite">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="csrf" value={document?.cookie?.match(/(?:^|; )csrf=([^;]+)/)?.[1] || ''} />
            <FormField name="username" control={control} render={({ field }: any) => (
              <FormItem><FormLabel htmlFor="username">Username (optional)</FormLabel><FormControl><Input id="username" name="username" placeholder="yourname" {...field} /></FormControl><FormMessage name="username" /></FormItem>
            )} />
            <FormField name="password" control={control} render={({ field }: any) => (
              <FormItem><FormLabel htmlFor="password">Password</FormLabel><FormControl><Input id="password" name="password" type="password" required {...field} /></FormControl><FormMessage name="password" /></FormItem>
            )} />
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <Button type="submit" className="w-full" disabled={submitting || isSubmitting}>{submitting ? 'Submitting…' : 'Accept Invite'}</Button>
          </form>
          </RHFProvider>
        </CardContent>
      </Card>
    </main>
  )
}
