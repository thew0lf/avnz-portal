"use client"
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'
import { useRouter } from 'next/navigation'

export default function Forgot() {
  const [client, setClient] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { success, error: toastError } = useToast()
  const router = useRouter()
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/auth/request-reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_code: client, email }) })
    // Always redirect with generic success to prevent account enumeration
    router.push('/login?msg=reset-sent')
  }
  return (
    <main className="p-6 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Request password reset</CardTitle></CardHeader>
        <CardContent>
          <form method="post" onSubmit={onSubmit} className="space-y-3">
            <Input value={client} onChange={(e)=>setClient(e.target.value)} placeholder="client code" />
            <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="email" />
            <Button disabled={loading} type="submit">{loading ? 'Sending...' : 'Send reset link'}</Button>
            {/* No details shown for SOC2 compliance */}
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
