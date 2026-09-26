const CACHE_NAME = 'turnos-app-v13';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './src/core/constants/domain.js',
  './src/core/constants/storage-keys.js',
  './src/core/date.js',
  './src/core/html.js',
  './src/core/ports/store.port.js',
  './src/core/infrastructure/local-storage.store.js',
  './src/core/infrastructure/memory.store.js',
  './src/core/infrastructure/persistence-notifier.js',
  './src/core/infrastructure/navigation.service.js',
  './src/features/auth/infrastructure/config.js',
  './src/features/auth/application/ports.js',
  './src/features/auth/infrastructure/supabase-auth.adapter.js',
  './src/features/auth/presentation/auth.controller.js',
  './src/features/sync/application/ports.js',
  './src/features/sync/infrastructure/supabase-sync.adapter.js',
  './src/features/sync/infrastructure/null-sync.adapter.js',
  './src/features/settings/application/ports.js',
  './src/features/settings/infrastructure/local-settings.repository.js',
  './src/features/settings/presentation/employee-names-view.js',
  './src/features/settings/presentation/demand-view.js',
  './src/features/settings/presentation/week-nav-view.js',
  './src/features/settings/presentation/settings.controller.js',
  './src/features/scheduling/domain/entities.js',
  './src/features/scheduling/domain/rules/demand.js',
  './src/features/scheduling/domain/patterns.js',
  './src/features/scheduling/domain/scheduler.js',
  './src/features/scheduling/application/ports.js',
  './src/features/scheduling/application/generate-schedules.usecase.js',
  './src/features/scheduling/infrastructure/local-schedule.repository.js',
  './src/features/scheduling/presentation/schedule-view.js',
  './src/features/scheduling/presentation/schedule.controller.js',
  './src/features/audit/domain/audit-report.entity.js',
  './src/features/audit/domain/audit-schedule.js',
  './src/features/audit/presentation/audit-view.js',
  './src/features/export/domain/csv-builder.js',
  './src/features/export/domain/share-text.js',
  './src/features/export/infrastructure/dom-download.adapter.js',
  './src/features/export/infrastructure/navigator-share.adapter.js',
  './src/features/export/infrastructure/html2pdf.adapter.js',
  './src/features/individual/presentation/individual-view.js',
  './src/features/individual/presentation/individual.controller.js',
  './src/main.js',
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
