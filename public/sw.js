const SW_URL = new URL(self.location.href);
const VERSION = SW_URL.searchParams.get('v') || 'dev';
const CACHE = `pickleball-journal-${VERSION}`;
const APP_SCOPE = new URL(self.registration.scope).pathname;
const INDEX_URL = `${APP_SCOPE}index.html`;

const isSameOrigin = (request) => {
  const requestUrl = new URL(request.url);
  return requestUrl.origin === self.location.origin;
};

const isStaticAsset = (request) =>
  ['script', 'style', 'image', 'font'].includes(request.destination) ||
  request.url.includes('/assets/');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(INDEX_URL))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !isSameOrigin(request)) {
    return;
  }

  // Navigation/doc requests: network first, cache fallback when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(INDEX_URL, copy));
          return response;
        })
        .catch(async () => {
          const cachedIndex = await caches.match(INDEX_URL);
          return cachedIndex || caches.match(request);
        })
    );
    return;
  }

  // Static assets: cache first with background refresh.
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => undefined);

        return cached || networkFetch;
      })
    );
  }
});
