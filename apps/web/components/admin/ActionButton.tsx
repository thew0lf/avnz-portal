"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

export function ActionButton({
  path,
  method = 'POST',
  label,
  body,
  variant,
  onDone,
}: {
  path: string
  method?: 'POST' | 'PATCH' | 'DELETE'
  label: string
  body?: any
  variant?: React.ComponentProps<typeof Button>['variant']
  onDone?: (ok: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  async function onClick() {
    setLoading(true)
    setError(null)
    const r = await fetch('/api/admin/proxy', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path, method, body }),
    })
    const ok = r.ok
    if (!ok) {
      try { const data = await r.json(); const msg = data?.error || data?.message || 'Action failed'; setError(msg); toastError(msg) } catch { setError('Action failed'); toastError('Action failed') }
    } else {
      success(label + ' succeeded')
    }
    setLoading(false)
    onDone?.(ok)
  }
  return (
    <div>
      <Button type="button" onClick={onClick} disabled={loading} variant={variant}>
        {loading ? 'Working…' : label}
      </Button>
      {error && <div className="mt-1 text-sm text-red-600" role="alert">{error}</div>}
    </div>
  )
}
