const CACHE_NAME = 'ds-loreto-v2'
const URLS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/loreto.png'
]

// Instalación y guardado inicial en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE)
    })
  )
  self.skipWaiting()
})

// Activación y limpieza de cachés viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache)
          }
        })
      );
    })
  )
  self.clients.claim()
})

// Interceptación de peticiones de red
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  // Ignorar peticiones directas a la base de datos de Supabase (las maneja Dexie offline)
  if (event.request.url.includes('supabase.co')) return

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Si el recurso (HTML, JS, CSS) ya existe en caché, devolverlo inmediatamente
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse))
            }
          })
          .catch(() => {})
        return cachedResponse
      }

      // 2. Si no está en caché, ir a buscarlo a la red y guardar una copia para el futuro
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse
          }
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
          return networkResponse
        })
        .catch(() => {
          // 3. Fallback en caso de estar totalmente sin conexión
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
        })
    })
  )
})