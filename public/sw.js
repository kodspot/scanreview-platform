const CACHE_NAME = "scanreview-v1";
const CORE_ASSETS = [
  "/",
  "/login",
  "/platform-provision",
  "/offline",
  "/manifest.webmanifest",
  "/pwa-192.svg",
  "/pwa-512.svg",
];

const PUBLIC_NAVIGATION_CACHEABLE = new Set(["/", "/login", "/offline"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const pathname = new URL(request.url).pathname;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (PUBLIC_NAVIGATION_CACHEABLE.has(pathname)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match("/offline");
        }),
    );
    return;
  }

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/super-admin")) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match("/offline"));
    }),
  );
});
