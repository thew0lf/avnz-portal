"use client"
import * as React from 'react'
import { cn } from '@/lib/utils'

export function Avatar({
  name,
  email,
  className = '',
  size = 32,
}: {
  name?: string | null
  email?: string | null
  className?: string
  size?: number
}) {
  const initials = React.useMemo(() => {
    const n = String(name || email || '?').trim()
    if (!n) return '?'
    const parts = n.split(/\s+/)
    const first = parts[0]?.[0] || ''
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : ''
    return (first + last).toUpperCase() || '?'
  }, [name, email])
  const style: React.CSSProperties = { width: size, height: size }
  return (
    <div
      aria-label={name || email || 'User'}
      className={cn('inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-700 font-medium select-none', className)}
      style={style}
    >
      <span className="text-xs" aria-hidden>
        {initials}
      </span>
    </div>
  )
}

