"use client"
import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

export default function HeaderUserMenu({ name, email }: { name: string | null; email: string | null }) {
  const displayName = name || (email ? email.split('@')[0] : 'Account')
  const pathname = usePathname() || ''
  const onSettings = pathname.startsWith('/settings')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open user menu"
          className="inline-flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar name={name || displayName} email={email || undefined} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-0 overflow-hidden">
        <div className="px-4 py-3 border-b bg-white">
          <div className="text-sm font-semibold leading-tight truncate">{displayName}</div>
          {email && <div className="mt-0.5 text-xs text-muted-foreground truncate">{email}</div>}
        </div>
        <div className="py-1">
          <DropdownMenuItem asChild>
            <Link
              href="/settings/profile"
              className={
                'w-full ' + (onSettings ? 'font-medium text-gray-900' : '')
              }
              aria-current={onSettings ? 'page' : undefined}
            >
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <button
              type="button"
              className="w-full text-left"
              onClick={async()=>{ try { await fetch('/api/logout', { method: 'POST' }); } finally { window.location.href='/login' } }}
            >
              Log out
            </button>
          </DropdownMenuItem>
        </div>
        <div className="px-4 py-3 border-t bg-white" aria-label="Accounts">
          <div className="text-xs text-muted-foreground">Accounts</div>
          <button type="button" className="mt-2 flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            Current account
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
