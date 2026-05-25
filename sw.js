const CACHE_NAME = 'jardin-v5-storage';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && r.status === 200) {
          const rc = r.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, rc));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
