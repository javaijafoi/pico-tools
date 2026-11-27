// gerado por build.mjs
const V = 'pico-tools-e7ea7b89';
// Motores e modelos (CDN) ficam no cache 'pico-modelos', que sobrevive às novas versões do site.
const MOD = /^https:\/\/(staticimgly\.com\/|cdn\.jsdelivr\.net\/(npm\/(@ffmpeg\/core|@imgly|onnxruntime-web|tesseract\.js-core)|gh\/naptha\/tessdata))/;
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(["/","/css/style.css","/js/app.js","/js/lib.js","/js/registry.js","/fonts/vt323.woff2","/fonts/ps2p.woff2","/favicon.svg"])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'pico-modelos').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method === 'GET' && MOD.test(r.url) && !r.headers.has('range')) { e.respondWith(caches.open('pico-modelos').then(async c => { const hit = await c.match(r.url); if (hit) return hit; const res = await fetch(r); if (res.status === 200) c.put(r.url, res.clone()).catch(() => {}); return res; })); return; }
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  // Rede primeiro: quem está online sempre recebe a versão mais nova; sem rede, usa a cópia guardada.
  e.respondWith(caches.open(V).then(async c => {
    try {
      const res = await Promise.race([fetch(r, { cache: 'no-cache' }), new Promise((_, no) => setTimeout(() => no(new Error('lento')), 6000))]);
      if (res.ok) c.put(r, res.clone()); return res;
    } catch { return (await c.match(r)) || (await c.match(r, { ignoreSearch: true })) || Response.error(); }
  }));
});
