/**
 * ==========================================================================
 * TRIKI MASTER - SERVICE WORKER v2 (PWA Offline Cache)
 * ==========================================================================
 */

const CACHE_NAME = 'triki-master-v2';

// Lista completa de archivos a guardar en caché
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon.svg'
];

// INSTALACIÓN: pre-cachear todos los archivos del juego
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
      .catch((err) => console.error('[SW] Error en instalación:', err))
  );
});

// ACTIVACIÓN: limpiar cachés de versiones anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// FETCH: estrategia "Cache First, fallback a red"
self.addEventListener('fetch', (event) => {
  // Solo manejar peticiones GET al mismo origen
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si está en caché, devolverlo inmediatamente
      if (cachedResponse) {
        return cachedResponse;
      }

      // Si no está en caché, buscarlo en la red y guardarlo
      return fetch(event.request.clone()).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Sin internet: servir index.html para navegación
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
