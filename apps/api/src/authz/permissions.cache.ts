type CacheEntry<T> = { value: T; exp: number }

export class SimpleCache<T> {
  private map = new Map<string, CacheEntry<T>>()
  constructor(private ttlMs = 10_000) {}
  get(key: string): T | undefined {
    const e = this.map.get(key)
    if (!e) return undefined
    if (Date.now() > e.exp) { this.map.delete(key); return undefined }
    return e.value
  }
  set(key: string, value: T) { this.map.set(key, { value, exp: Date.now() + this.ttlMs }) }
  clear() { this.map.clear() }
}

export const permCache = new SimpleCache<any>(5000)
