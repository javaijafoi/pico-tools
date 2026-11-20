// gerado por build.mjs
const V = 'pico-tools-e5ec183a';
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(["/","/css/style.css","/js/app.js","/js/lib.js","/js/registry.js","/fonts/vt323.woff2","/fonts/ps2p.woff2","/favicon.svg"])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
