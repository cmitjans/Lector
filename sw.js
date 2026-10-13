// Guarda la app para usarla sin internet y recibe PDFs desde "Compartir".
// La página se pide primero a internet, así los cambios llegan solos.
const VERSION = 'lector-v6';
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
const APP = ['./', './manifest.webmanifest', './icono-192.png', './icono-512.png', CDN + 'pdf.min.js', CDN + 'pdf.worker.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(APP.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== VERSION && k !== 'lector-compartido').map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.pathname.endsWith('/compartido')) {
    e.respondWith((async () => {
      try {
        const form = await e.request.formData();
        const file = form.get('pdf');
        if (file) {
          const c = await caches.open('lector-compartido');
          await c.put('archivo', new Response(file, { headers: {
            'Content-Type': 'application/pdf',
            'X-Nombre': encodeURIComponent(file.name || 'documento.pdf')
          }}));
        }
      } catch (err) {}
      return Response.redirect('./?compartido=1', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(e.request.url.split('?')[0], { cache: 'no-cache' });
        if (res.ok) (await caches.open(VERSION)).put('./', res.clone());
        return res;
      } catch (err) {
        return (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }
  if (url.origin !== location.origin && !e.request.url.startsWith(CDN)) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request))
  );
});
