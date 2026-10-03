const CACHE_VERSION = 'v3'
const STATIC_CACHE = `my-notes-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `my-notes-dynamic-${CACHE_VERSION}`
const OFFLINE_CACHE = `my-notes-offline-${CACHE_VERSION}`

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/logo128.png',
  '/logo192.png',
  '/logo512.png',
  '/manifest.json',
  '/offline.html',
]

// Max cache sizes
const MAX_DYNAMIC_CACHE = 100
const MAX_AGE_DYNAMIC = 7 * 24 * 60 * 60 * 1000 // 7 days

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => 
            name !== STATIC_CACHE && 
            name !== DYNAMIC_CACHE && 
            name !== OFFLINE_CACHE
          )
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Dev server modules only exist during `vite dev` (production bundles live
  // under /assets/). Caching them makes the browser serve stale chunks after
  // file changes / HMR, which shows up as "old code" or stale-React failures.
  // Pass them straight through to the network.
  if (isDevServerModule(url)) {
    return
  }

  // Skip API requests - always go to network for fresh data
  if (url.pathname.startsWith('/v1/api/')) {
    event.respondWith(networkOnly(request))
    return
  }

  // Skip TanStack internal routes
  if (url.pathname.startsWith('/_')) {
    return
  }

  // Strategy selection based on resource type
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
  } else if (isPageRequest(request)) {
    event.respondWith(networkFirstWithTimeout(request, 3000))
  } else if (isImage(url.pathname)) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE))
  } else {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE))
  }
})

// Network Only - for API calls
async function networkOnly(request) {
  try {
    return await fetch(request)
  } catch (error) {
    // Return a proper offline response for API calls
    return new Response(
      JSON.stringify({ error: true, message: 'Offline', offline: true }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// Cache First strategy - good for static assets
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('', { status: 408, statusText: 'Offline' })
  }
}

// Network First with timeout - good for pages
async function networkFirstWithTimeout(request, timeout) {
  const fetchPromise = fetch(request)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeout)
  })

  try {
    const response = await Promise.race([fetchPromise, timeoutPromise])
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }
    // Return offline page
    const offlinePage = await caches.match('/offline.html')
    return offlinePage || new Response('Offline', { status: 503 })
  }
}

// Stale While Revalidate - good for less critical assets
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request)

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(cacheName)
        // Add timestamp for cache expiration
        const responseToCache = response.clone()
        const headers = new Headers(responseToCache.headers)
        headers.set('sw-cache-time', Date.now().toString())
        const timedResponse = new Response(await responseToCache.blob(), {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers,
        })
        cache.put(request, timedResponse)
      }
      return response
    })
    .catch(() => cached)

  return cached || fetchPromise
}

// Helper functions
// True for URLs that only exist in the Vite dev server and must never be
// cached: app source, node_modules (including the pre-bundled .vite/deps),
// the vite client/HMR runtime, and cache-busting query variants (?t=, ?v=,
// ?tsr-split=) that Vite attaches to dev modules.
function isDevServerModule(url) {
  const devPaths = ['/src/', '/node_modules/', '/@vite/', '/@id/', '/@fs/', '/@react-refresh']
  if (devPaths.some((p) => url.pathname.startsWith(p))) {
    return true
  }
  if (url.searchParams.has('tsr-split')) {
    return true
  }
  const q = url.searchParams
  return q.has('t') || q.has('v')
}

function isStaticAsset(pathname) {
  const extensions = ['.js', '.css', '.woff', '.woff2', '.ttf']
  return extensions.some((ext) => pathname.endsWith(ext))
}

function isImage(pathname) {
  const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico']
  return extensions.some((ext) => pathname.endsWith(ext))
}

function isPageRequest(request) {
  return request.headers.get('accept')?.includes('text/html')
}

// Cache cleanup - remove old entries
async function cleanupCache(cacheName, maxEntries, maxAge) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()

  if (keys.length > maxEntries) {
    const timestamps = await Promise.all(
      keys.map(async (key) => {
        const response = await cache.match(key)
        const time = response?.headers.get('sw-cache-time')
        return { key, time: time ? parseInt(time) : 0 }
      })
    )

    // Sort by time, oldest first
    timestamps.sort((a, b) => a.time - b.time)

    // Remove oldest entries
    const toDelete = timestamps.slice(0, keys.length - maxEntries)
    await Promise.all(toDelete.map((item) => cache.delete(item.key)))
  }

  // Remove expired entries
  const now = Date.now()
  for (const key of keys) {
    const response = await cache.match(key)
    const time = response?.headers.get('sw-cache-time')
    if (time && now - parseInt(time) > maxAge) {
      await cache.delete(key)
    }
  }
}

// Run cache cleanup periodically
setInterval(() => {
  cleanupCache(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE, MAX_AGE_DYNAMIC)
}, 60 * 60 * 1000) // Every hour

// Background sync for offline mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncPendingMutations())
  }
})

async function syncPendingMutations() {
  // Notify client to process offline queue
  const clients = await self.clients.matchAll()
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' })
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body || 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo128.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: data.renotify || false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'My Notes', options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const action = event.action
  const data = event.notification.data

  // Handle notification actions
  if (action === 'dismiss') {
    return
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: data?.url || '/',
            action,
          })
          return client.focus()
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(data?.url || '/')
      }
    })
  )
})

// Message handler for client communication
self.addEventListener('message', (event) => {
  const { type, payload } = event.data

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
    case 'CACHE_URLS':
      if (payload?.urls) {
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.addAll(payload.urls)
        })
      }
      break
    case 'CLEAR_CACHE':
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name))
      })
      break
  }
})
