/*
 * Antisocial service worker — deliberately minimal (HANDOFF-28b).
 * Job 1: exist, so the app is installable.
 * Job 2: cache static assets (icons, images, _next/static) cache-first.
 * Job 3: NEVER touch /api/* or auth — everything dynamic goes straight
 *        to the network. A safety platform must not serve stale state;
 *        a cached "someone is coming" would be a lie.
 * Web push lands here later for Narcan Watch alerts.
 */
const CACHE = "antisocial-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isStatic =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/images/"));

  if (event.request.method !== "GET" || !isStatic) return; // network as normal

  event.respondWith(
    caches.match(event.request).then(
      (hit) =>
        hit ||
        fetch(event.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
          return res;
        })
    )
  );
});
