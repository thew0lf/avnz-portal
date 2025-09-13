import { cookies } from 'next/headers'
import { getCookieName } from './auth'

export function apiBase() {
  return process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001'
}

export function serverApiBase() {
  return apiBase()
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = cookies().get(getCookieName())?.value
  const headers = new Headers(init.headers || {})
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (!headers.has('content-type') && init.body) headers.set('content-type', 'application/json')
  const res = await fetch(`${apiBase()}${path}`, { ...init, headers, cache: 'no-store' })
  return res
}
