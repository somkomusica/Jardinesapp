const CACHE_NAME = 'jardin-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => {
    return c.addAll(['/', '/jardin.html', '/manifest.json']).catch(() => {});
  }));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((names) => {
    return Promise.all(names.map((n) => n !== CACHE_NAME ? caches.delete(n) : null));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (!r || r.status !== 200 || r.type === 'error') return r;
        const rc = r.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, rc));
        return r;
      })
      .catch(() => {
        return caches.match(e.request).then((c) => c || new Response('Offline', {status: 503}));
      })
  );
});
