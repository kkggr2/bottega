/*
 * Bottega's service worker: only for notifications in browsers (Chrome, Edge, Firefox; Android and computers).
 * It doesn't cache pages. A push carries { title, body, url }; tapping it opens or focuses that page.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || "Bottega";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    tag: data.url || undefined,
    renotify: Boolean(data.url),
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of open) {
      if (new URL(client.url).origin === url.origin && "focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(url.href).catch(() => {});
        return;
      }
    }
    await self.clients.openWindow(url.href);
  })());
});
