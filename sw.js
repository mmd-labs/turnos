const CACHE_NAME = 'turnos-app-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './src/core/constants/domain.js',
  './src/core/constants/storage-keys.js',
  './src/core/date.js',
  './src/core/html.js',
  './src/constants.js',
  './src/scheduler.js',
  './src/toast.js',
  './src/theme.js',
  './src/storage.js',
  './src/renderer.js',
  './src/exporter.js',
  './src/individual.js',
  './src/help.js',
  './src/app.js',
  './src/auditor.js',
  './src/sync.js',
  './src/supabase.js',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './manifest.json',
  './vendor/html2pdf.bundle.min.js'
];

// Install event: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Some assets could not be precached:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network-first with cache fallback for fresh updates and offline support
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful GET responses for http/https only
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith('http')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(err => {
              console.warn('Cache put failed:', err);
            });
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed: return from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
