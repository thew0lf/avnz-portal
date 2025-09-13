import { cookies } from 'next/headers'

export function getCsrfToken(): string {
  const c = cookies().get('csrf')?.value
  return c || ''
}

