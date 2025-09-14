const CACHE = 'avnz-pwa-v1'
const TTL_MS = 10 * 60 * 1000 // 10 minutes
const CORE_ASSETS = ['/', '/offline.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  // App shell navigations: network-first, fallback to offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/offline.html'))
    )
    return
  }

  // Static assets: cache-first
  if (req.url.includes('/_next/static/') || req.url.includes('/icon') || req.url.includes('/public/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const resClone = res.clone()
        caches.open(CACHE).then((cache) => cache.put(req, resClone))
        return res
      }))
    )
    return
  }

  // API usage endpoints (same-origin): cache-first with 10-minute TTL, then network; fallback to cache offline
  if (req.url.includes('/api/usage/summary') || req.url.includes('/api/usage/timeseries')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(req)
      const now = Date.now()
      if (cached) {
        try {
          const cachedTime = Number(cached.headers.get('x-sw-cache-time') || '0')
          if (cachedTime && now - cachedTime < TTL_MS) return cached
        } catch {}
      }
      try {
        const res = await fetch(req)
        // Store with cache timestamp header
        const resClone = res.clone()
        const blob = await resClone.blob()
        const headers = new Headers(resClone.headers)
        headers.set('x-sw-cache-time', String(now))
        const stamped = new Response(blob, { status: resClone.status, statusText: resClone.statusText, headers })
        await cache.put(req, stamped)
        return res
      } catch (e) {
        if (cached) return cached
        throw e
      }
    })())
    return
  }

  // Default: network-first with cache fallback
  event.respondWith(
    fetch(req).then((res) => {
      const clone = res.clone()
      caches.open(CACHE).then((cache) => cache.put(req, clone))
      return res
    }).catch(() => caches.match(req))
  )
})
