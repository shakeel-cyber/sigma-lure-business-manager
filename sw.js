/**
 * Sigma Lures - Service Worker for Offline PWA Support
 * Caches core application assets while strictly preserving local database integrity.
 */

const CACHE_NAME = 'sigma-lures-v25';
const ASSETS_TO_CACHE = [
  './index.html',
  './styles.css',
  './app.js?v=25',
  './logo.png',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Install Event - Skip Waiting Immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {}
      }
    })
  );
});

// Activate Event - Delete Old Obsolete Caches Immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First Fetch Event for JS/HTML/CSS (Fallback to cache when offline)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  const isCoreAsset = url.includes('app.js') || url.includes('index.html') || url.includes('styles.css');

  if (isCoreAsset) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        });
      })
    );
  }
});
