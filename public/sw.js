/* moonbase service worker — minimal offline support for read-only views.
 *
 * Strategy:
 *  - Static assets (/_next/static, /icons, /manifest.json): cache-first,
 *    populate on first hit.
 *  - HTML navigations: network-first, fall back to whatever's cached and
 *    finally to the offline shell.
 *  - Mutations (anything not GET) bypass the SW entirely.
 *
 * This is intentionally conservative — we'd rather show stale data than
 * confuse the user with a fully-broken UI when their connection drops.
 */

const CACHE_VERSION = "moonbase-v1";
const PRECACHE_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json";

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cache = await caches.open(CACHE_VERSION);
          const cached = await cache.match(request);
          if (cached) return cached;
          return new Response(
            "<html><body style='font-family:sans-serif;padding:2rem;color:#1a1d2e'><h1>moonbase</h1><p>Sem conexão e nada em cache para esta página.</p></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
          );
        }
      })(),
    );
  }
});
