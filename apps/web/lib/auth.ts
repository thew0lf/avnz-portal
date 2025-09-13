import crypto from 'crypto'

export type Session = {
  userId: string
  email: string
  orgId: string
  roles: string[]
  iat: number
  orgUUID?: string
  clientCode?: string
  perms?: string[]
}

const COOKIE_NAME = 'session'

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function b64urlDecode(input: string) {
  input = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = input.length % 4
  if (pad) input += '='.repeat(4 - pad)
  return Buffer.from(input, 'base64').toString('utf8')
}

function sign(data: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url')
}

export function createToken(payload: Omit<Session, 'iat'>, secret: string) {
  const body: Session = { ...payload, iat: Math.floor(Date.now() / 1000) }
  const serialized = JSON.stringify(body)
  const p = b64url(serialized)
  const sig = sign(p, secret)
  return `${p}.${sig}`
}

export function verifyToken(token: string, secret: string): Session | null {
  const [p, sig] = token.split('.')
  if (!p || !sig) return null
  const expected = sign(p, secret)
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const json = b64urlDecode(p)
    const obj = JSON.parse(json)
    return obj
  } catch {
    return null
  }
}

export function getCookieName() {
  return COOKIE_NAME
}

export function getDemoUsers(): Array<{
  email: string
  password: string
  userId: string
  orgId: string
  roles: string[]
}> {
  try {
    const raw = process.env.DEMO_USERS
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return arr
  } catch {
    // ignore
  }
  return []
}
