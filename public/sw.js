/* Service worker: network-first with cache fallback (offline support). */
const CACHE = "chemquiz-v1.0.1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const u of ["./", "./index.html", "./manifest.webmanifest"]) {
        await cache.add(u).catch(() => {});
      }
      try {
        const res = await fetch("./questions/chem-bank.json", { cache: "no-cache" });
        if (res.ok) {
          await cache.put("./questions/chem-bank.json", res.clone());
          const bank = await res.json();
          const urls = new Set();
          for (const q of bank.questions || []) {
            for (const u of q.stemImages || []) if (u) urls.add(u);
            for (const o of q.options || []) if (o.imageUrl) urls.add(o.imageUrl);
          }
          await Promise.all([...urls].map((u) => cache.add(u).catch(() => {})));
        }
      } catch (e) {
        /* offline install: ignore */
      }
    })()
  );
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
