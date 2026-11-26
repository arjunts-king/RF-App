// Seafood Purchase App - Offline PWA Service Worker (V41 - Always-Fresh Network Pass-Through & Cache Purge)
const CACHE_VERSION = 'seafood-pwa-v41';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    })
  );
  self.clients.claim();
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
