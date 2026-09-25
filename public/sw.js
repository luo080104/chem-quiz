/* Service worker: network-first with cache fallback (offline support). */
const CACHE = "chemquiz-v1.0.0";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html"]).catch(() => {})));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        const cached = await cache.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const idx = (await cache.match("./index.html")) || (await cache.match("./"));
          if (idx) return idx;
        }
        return Response.error();
      }
    })()
  );
});
