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
  const url = `${apiBase()}${path}`
  let lastErr: any = null
  const tries = Number(process.env.API_FETCH_RETRIES || 3)
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...init, headers, cache: 'no-store' })
      return res
    } catch (e) {
      lastErr = e
      // backoff: 200ms, 500ms, 1000ms...
      const ms = i === 0 ? 200 : i === 1 ? 500 : 1000
      await new Promise(r => setTimeout(r, ms))
    }
  }
  throw lastErr
}
