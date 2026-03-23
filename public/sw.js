// --- Install: cache offline fallback ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("offline-v1").then((cache) => cache.add("/offline.html"))
  );
  self.skipWaiting();
});

// --- Activate: clean up old caches ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== "offline-v1").map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// --- Fetch: offline fallback for navigation ---
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/offline.html")
      )
    );
  }
});

// --- Push notifications ---
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

// --- Notification click: open the app ---
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/order";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
