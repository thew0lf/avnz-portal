"use client"
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function Reset() {
  const sp = useSearchParams()
  const token = sp.get('token') || ''
  const [password, setPassword] = useState('new-password')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const r = await fetch('/api/auth/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password }) })
    const data = await r.json()
    setResult(data)
    setLoading(false)
  }
  return (
    <main className="p-6 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Reset password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="new password" />
            <Button disabled={loading} type="submit">{loading ? 'Resetting...' : 'Reset'}</Button>
            {result && <div className="text-sm text-muted-foreground">{result.ok ? 'Password reset' : String(result.error || 'Failed')}</div>}
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

