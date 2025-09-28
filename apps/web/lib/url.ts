import { headers } from 'next/headers'

export function absoluteUrl(path: string) {
  const h = headers()
  const proto = h.get('x-forwarded-proto') || 'http'
  const host = h.get('x-forwarded-host') || h.get('host')
  if (!host) throw new Error('Host header missing')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${proto}://${host}${p}`
}

