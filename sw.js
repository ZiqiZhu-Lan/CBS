// public/sw.js
// Strategy: App Shell + Cache First for assets, Stale-While-Revalidate for JS/CSS

const CACHE_NAME = 'cbs-v1';

// ── Install: pre-cache App Shell ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/index.html', '/']))
  );
  self.skipWaiting();
});

// ── Activate: purge stale caches ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: route-based caching strategies ─────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  const isAsset =
    url.pathname.includes('/static/media/') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.png');

  // Audio & images: Cache First
  if (isAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  const isStatic =
    url.pathname.includes('/static/js/') || url.pathname.includes('/static/css/');

  // JS/CSS: Stale-While-Revalidate
  if (isStatic) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request).then((response) => {
            cache.put(request, response.clone());
            return response;
          });
          return cached || network;
        })
      )
    );
    return;
  }

  // Navigation: Network First, fallback to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
  }
});