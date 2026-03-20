const CACHE_NAME = "ordering-v3";

// ─── Install ────────────────────────────────────────────────
// Don't pre-cache navigation routes — they redirect through i18n middleware
// and cache.addAll() failures would block SW installation entirely.
// Instead, let the fetch handler cache pages on first visit.
self.addEventListener("install", () => {
  self.skipWaiting();
});

// ─── Activate — clean up old caches ─────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch — network-first for API, cache-first for assets ──
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Network-first for API calls
  if (request.url.includes("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

// ─── Push notifications ─────────────────────────────────────
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || "/images/icon-192.png",
      badge: "/images/icon-192.png",
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/order",
      },
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// ─── Notification click — open the app ──────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/order";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    })
  );
});
