import type { Request, Response, NextFunction } from 'express'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

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

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const k = keyFor(req)
  const { windowMs, max } = limitFor(k)
  const now = Date.now()
  let b = buckets.get(k)
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + windowMs }
    buckets.set(k, b)
  }
  b.count += 1
  res.setHeader('X-RateLimit-Limit', String(max))
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - b.count)))
  res.setHeader('X-RateLimit-Reset', String(Math.floor(b.resetAt / 1000)))
  if (b.count > max) {
    res.status(429).json({ error: 'rate_limited', reset: new Date(b.resetAt).toISOString() })
    return
  }
  next()
}

