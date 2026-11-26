// Seafood Purchase App - Self-Cleaning Service Worker (V43 - Purge Legacy Caches & Unregister Safely without Reload Loop)
const CACHE_VERSION = 'seafood-pwa-v43';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const isNavigation = event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html');
  if (isNavigation) {
    event.respondWith(fetch(new Request(event.request, { cache: 'no-store' })).catch(() => fetch(event.request)));
    return;
  }
  event.respondWith(fetch(event.request));
});
