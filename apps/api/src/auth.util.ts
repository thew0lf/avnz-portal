import crypto from 'crypto'
import argon2 from 'argon2'

export type JwtLike = {
  userId: string
  email: string
  orgId: string // for backwards compatibility: client code currently used by domain tables
  roles: string[]
  iat: number
  orgUUID?: string
  clientCode?: string
  clientId?: string
  perms?: string[]
}

export function signToken(payload: Omit<JwtLike, 'iat'>, secret: string) {
  const body: JwtLike = { ...payload, iat: Math.floor(Date.now() / 1000) }
  const p = Buffer.from(JSON.stringify(body)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(p).digest('base64url')
  return `${p}.${sig}`
}

export function verifyToken(token: string, secret: string): JwtLike | null {
  const [p, sig] = token.split('.')
  if (!p || !sig) return null
  const expected = crypto.createHmac('sha256', secret).update(p).digest('base64url')
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try { return JSON.parse(Buffer.from(p, 'base64url').toString('utf8')) } catch { return null }
}

export async function hashPassword(password: string) {
  return await argon2.hash(password, { type: argon2.argon2id })
}

export function scryptHash(password: string, salt?: string) { // keep for backward-compat seeds
  const s = salt || crypto.randomBytes(16).toString('hex')
  const key = crypto.scryptSync(password, s, 32)
  return `scrypt:${s}:${key.toString('hex')}`
}

export async function verifyPassword(password: string, hash: string) {
  if (hash.startsWith('$argon2')) {
    try { return await argon2.verify(hash, password) } catch { return false }
  }
  if (hash.startsWith('scrypt:')) {
    const [, salt, hex] = hash.split(':')
    const derived = crypto.scryptSync(password, salt, 32).toString('hex')
    return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hex))
  }
  return false
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function sha256hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}
