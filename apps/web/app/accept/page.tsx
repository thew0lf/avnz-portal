"use client"
import { useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function AcceptInvitePage() {
  const sp = useSearchParams()
  const token = sp.get('token') || ''
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const r = await fetch('/api/auth/accept-invite', { method: 'POST', body: form })
    if (!r.ok) {
      const data = await r.json().catch(()=>({ error: 'Failed to accept invite' }))
      setError(data?.message || data?.error || 'Failed to accept invite')
      setSubmitting(false)
      return
    }
    // redirect handled by route
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
          <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <div className="space-y-2">
              <Label htmlFor="username">Username (optional)</Label>
              <Input id="username" name="username" placeholder="yourname" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Submitting…' : 'Accept Invite'}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

