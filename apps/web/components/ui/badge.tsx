import * as React from 'react'
import { cn } from '@/lib/utils'

export function Badge({ className = '', variant = 'default', ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' }) {
  const variants: Record<string, string> = {
    default: 'bg-black text-white border-transparent',
    secondary: 'bg-gray-100 text-gray-800 border-transparent',
    outline: 'bg-transparent text-gray-800 border-gray-300',
    success: 'bg-green-100 text-green-800 border-transparent',
    warning: 'bg-yellow-100 text-yellow-800 border-transparent',
    destructive: 'bg-red-100 text-red-800 border-transparent',
  }
  return <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-2xs border', variants[variant] || variants.default, className)} {...props} />
}

