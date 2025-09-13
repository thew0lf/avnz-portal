"use client"
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function Forgot() {
  const [client, setClient] = useState('demo')
  const [email, setEmail] = useState('alice@example.com')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const r = await fetch('/api/auth/request-reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_code: client, email }) })
    const data = await r.json()
    setResult(data)
    setLoading(false)
  }
  return (
    <main className="p-6 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Request password reset</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input value={client} onChange={(e)=>setClient(e.target.value)} placeholder="client code" />
            <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="email" />
            <Button disabled={loading} type="submit">{loading ? 'Sending...' : 'Send reset link'}</Button>
            {result && (
              <div className="text-sm text-muted-foreground">
                {result.reset_token ? (
                  <div>Dev token: <code>{result.reset_token}</code></div>
                ) : (
                  <div>Check your email (simulated)</div>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
