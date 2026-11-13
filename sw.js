const CACHE = "obhod-v4";
const FILES = ["./", "index.html", "manifest.json", "icon.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Есть интернет — свежая версия с сайта; нет интернета — из памяти телефона
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch(req, {cache: "no-store", signal: ctl.signal}); clearTimeout(tm);
      if (r && r.ok) c.put(req, r.clone());
      return r;
    } catch (err) {
      const hit = await c.match(req, {ignoreSearch: true});
      if (hit) return hit;
      if (req.mode === "navigate") return c.match("index.html");
      return new Response("", {status: 504});
    }
  }));
});
