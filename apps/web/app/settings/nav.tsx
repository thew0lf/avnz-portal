"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SettingsNav(){
  const pathname = usePathname() || ''
  const items = [
    { href:'/settings/profile', label:'Profile' },
    { href:'/settings/password', label:'Password' },
    { href:'/settings/appearance', label:'Appearance' },
  ]
  return (
    <nav aria-label="Settings" className="space-y-1">
      {items.map(it => {
        const active = pathname.startsWith(it.href)
        return (
          <Link
            key={it.href}
            href={it.href}
            className={
              'block rounded px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 ' +
              (active ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50')
            }
            aria-current={active ? 'page' : undefined}
          >
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}

