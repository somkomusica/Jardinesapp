// Jardín Service Worker — Network First con auto-update
const CACHE_NAME = 'jardin-v29-deseos';
const ESSENTIAL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ESSENTIAL_FILES).catch(err => {
        console.warn('SW: algunos archivos no se pudieron cachear', err);
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// ===== Web Share Target: "Compartir con… Jardín" =====
// El teléfono hace POST a ./share-target con los archivos/links compartidos.
// Los guardamos en un cache propio y redirigimos a la app con ?shared=1,
// que los lee y los mete al Muro (o como semilla).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith((async () => {
      try {
        const form = await req.formData();
        const files = form.getAll('files') || [];
        const cache = await caches.open('jardin-share');
        const keys = [];
        let i = 0;
        for (const f of files) {
          if (!f || typeof f === 'string' || !f.size) continue;
          const key = `./shared-file-${Date.now()}-${i++}`;
          await cache.put(key, new Response(f, { headers: {
            'content-type': f.type || 'application/octet-stream',
            'x-filename': encodeURIComponent(f.name || 'compartido')
          }}));
          keys.push(key);
        }
        const meta = {
          title: form.get('title') || '',
          text: form.get('text') || '',
          url: form.get('url') || '',
          files: keys,
          ts: Date.now()
        };
        await cache.put('./shared-meta', new Response(JSON.stringify(meta), { headers: { 'content-type': 'application/json' } }));
      } catch (e) { /* si algo falla, igual abrimos la app */ }
      return Response.redirect('./index.html?shared=1', 303);
    })());
    return;
  }
  if (req.method !== 'GET') return;

  const skipCache =
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('google.com');

  if (skipCache) return;

  event.respondWith(
    fetch(req)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(req).then(cached => {
          if (cached) return cached;
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Sin conexion', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
