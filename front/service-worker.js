const CACHE_NAME = "app-cache-v12";
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/js/app.js",
  "/js/assets/styles.css",
  "/assets/icon-128.png",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
];

// -------- Install: Precache core assets --------
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// -------- Activate: Cleanup old caches --------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// -------- Fetch handling --------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const accept = req.headers.get("accept") || "";

  if (req.method !== "GET") return;

  // HTML navigation (pages)
  if (accept.includes("text/html")) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Static assets (JS, CSS, icons, etc.)
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.includes("/assets/")
  ) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Images
  if (req.destination === "image") {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // API calls (fallback to cache if offline)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(req, true));
    return;
  }
});

// -------- Caching Strategies --------

// Network-first: try network, fallback to cache/offline page
async function networkFirst(req, isAPI = false) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    if (isAPI) {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      return cached || new Response(JSON.stringify({ error: "offline" }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      return cached || cache.match(OFFLINE_URL);
    }
  }
}

// Cache-first: return cache if available, else fetch and cache
async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;

  const fresh = await fetch(req);
  cache.put(req, fresh.clone());
  return fresh;
}

// Stale-while-revalidate: show cached quickly, update in background
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// -------- Push Notifications --------
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const { title, message, url } = event.data.json();

  event.waitUntil(
    self.registration.showNotification(title, {
      body: message,
      icon: "/assets/icon-128.png",
      badge: "/assets/icon-128.png",
      data: { url },
      actions: [{ action: "open", title: "Open" }],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
