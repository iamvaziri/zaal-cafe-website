// Zaal Cafe service worker: lets a menu that was opened once be opened again offline.
// Never touches /api/, /admin, non-GET or other-origin requests.
const VERSION = "zaal-v5";
const PAGE_CACHE = `${VERSION}-pages`;
const ASSET_CACHE = `${VERSION}-assets`;
const PAGES = ["/", "/en/", "/fa/menu/", "/en/menu/"];
const STATIC = [
  "/assets/logo.png",
  "/assets/fonts/vazirmatn-variable.woff2",
  "/assets/fonts/anton-regular.subset.woff2",
];
const MAX_ASSETS = 150;

const cacheable = (response) =>
  response && response.ok && response.status === 200 && response.type === "basic" && !response.redirected;

async function precache(cacheName, urls) {
  const cache = await caches.open(cacheName);
  // One failing address must not break the install.
  await Promise.all(
    urls.map((url) =>
      fetch(url, { cache: "reload" })
        .then((response) => (cacheable(response) ? cache.put(url, response) : undefined))
        .catch(() => undefined),
    ),
  );
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([precache(PAGE_CACHE, PAGES), precache(ASSET_CACHE, STATIC)]).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== PAGE_CACHE && key !== ASSET_CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function navigate(event) {
  const request = event.request;
  const url = new URL(request.url);
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (cacheable(response)) {
      // Only the real pages are stored (unknown paths also answer 200 with the app shell).
      if (PAGES.includes(url.pathname)) event.waitUntil(cache.put(url.pathname, response.clone()));
      return response;
    }
    if (response.status >= 500) {
      const cached = await cache.match(url.pathname);
      if (cached) return cached;
    }
    return response;
  } catch (_) {
    const cached =
      (await cache.match(url.pathname)) ||
      (await cache.match(url.pathname.startsWith("/en") ? "/en/" : "/")) ||
      (await cache.match("/"));
    return (
      cached ||
      new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
    );
  }
}

async function asset(event) {
  const request = event.request;
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then(async (response) => {
      if (cacheable(response)) {
        await cache.put(request, response.clone());
        await trim(ASSET_CACHE, MAX_ASSETS);
      }
      return response;
    })
    .catch(() => undefined);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  return (await refresh) || new Response("", { status: 504 });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;
  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname === "/admin" ||
    url.pathname.startsWith("/admin/")
  ) {
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(navigate(event));
  } else if (url.pathname.startsWith("/assets/")) {
    event.respondWith(asset(event));
  }
});
