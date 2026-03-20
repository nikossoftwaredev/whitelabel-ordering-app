// ─── Install ────────────────────────────────────────────────
// No custom caching — rely on the browser's normal HTTP cache.
// The SW exists only for PWA installability and push notifications.
self.addEventListener("install", () => {
  self.skipWaiting();
});

// ─── Activate — clean up any old caches from previous SW versions ─
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
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
