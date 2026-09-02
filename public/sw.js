/* Service worker — guitareapprentissage (écrit à la main, sans dépendance).
 * Objectif : rendre l'app installable et la théorie déjà consultée disponible
 * hors-ligne. Stratégies :
 *   - navigations (pages)        → network-first, repli sur le cache
 *   - assets statiques (_next…)  → stale-while-revalidate
 * Les requêtes non-GET et cross-origin ne sont pas interceptées.
 */
const CACHE = "gp-cache-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpg|jpeg|svg|gif|webp|ico|json)$/.test(
      url.pathname,
    )
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Ne pas mettre en cache les appels de données/auth.
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          const cached = (await cache.match(req)) || (await cache.match("/"));
          return (
            cached ||
            new Response(
              "<!doctype html><meta charset=utf-8><title>Hors-ligne</title>" +
                "<body style='font-family:system-ui;background:#0a0a0a;color:#ededed;" +
                "display:flex;min-height:100vh;align-items:center;justify-content:center;" +
                "text-align:center;padding:2rem'><div><h1>Hors-ligne</h1>" +
                "<p>Cette page n'a pas encore été consultée en ligne.</p></div>",
              {
                status: 503,
                headers: { "Content-Type": "text/html; charset=utf-8" },
              },
            )
          );
        }
      })(),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
  }
});
