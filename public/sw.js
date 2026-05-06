const CACHE = 'replykit-v1'

// Cache app shell on install
self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(['/', '/dashboard'])
    ).catch(() => {})
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Network-first for API and auth; cache-first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Always network for API routes and supabase
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    return
  }

  // Cache-first for static files
  if (
    event.request.method === 'GET' &&
    (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(js|css|png|svg|ico|woff2?)$/))
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => cached ?? fetch(event.request))
    )
    return
  }

  // Network-first for pages — fall back to cache when offline
  if (event.request.method === 'GET' && event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
  }
})
