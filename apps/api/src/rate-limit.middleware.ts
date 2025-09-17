import type { Request, Response, NextFunction } from 'express'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()
let redisClient: any = null as any
const redisUrl = process.env.REDIS_URL || ''
async function getRedis() {
  if (!redisUrl) return null
  if (redisClient) return redisClient
  try {
    // Dynamically import to keep optional
    const mod = await import('redis') as any
    const client = mod.createClient({ url: redisUrl })
    client.on('error', () => {})
    await client.connect()
    redisClient = client
    return client
  } catch {
    return null
  }
}

function keyFor(req: Request) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
  const route = req.path.startsWith('/auth/login')
    ? '/auth/login'
    : req.path.startsWith('/auth')
    ? '/auth'
    : 'global'
  return `${route}:${ip}`
}

function limitFor(routeKey: string) {
  if (routeKey.startsWith('/auth/login')) return { windowMs: 60_000, max: 5 }
  if (routeKey.startsWith('/auth')) return { windowMs: 60_000, max: 20 }
  return { windowMs: 60_000, max: 120 }
}

export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const k = keyFor(req)
  const { windowMs, max } = limitFor(k)
  const now = Date.now()
  const redis = await getRedis()
  if (redis) {
    const ttlSec = Math.ceil(windowMs / 1000)
    const key = `rl:${k}`
    let count = await redis.incr(key)
    if (count === 1) await redis.expire(key, ttlSec)
    const ttl = await redis.ttl(key)
    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - count)))
    res.setHeader('X-RateLimit-Reset', String(Math.floor((now + ttl * 1000) / 1000)))
    if (count > max) { res.status(429).json({ error: 'rate_limited' }); return }
    return next()
  }
  // Fallback in-memory
  let b = buckets.get(k)
  if (!b || b.resetAt < now) { b = { count: 0, resetAt: now + windowMs }; buckets.set(k, b) }
  b.count += 1
  res.setHeader('X-RateLimit-Limit', String(max))
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - b.count)))
  res.setHeader('X-RateLimit-Reset', String(Math.floor(b.resetAt / 1000)))
  if (b.count > max) { res.status(429).json({ error: 'rate_limited', reset: new Date(b.resetAt).toISOString() }); return }
  next()
}
