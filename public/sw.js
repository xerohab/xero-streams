// Network-only service worker: never cache private account data or streams.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  if (event.request.mode === "navigate") event.respondWith(fetch(event.request).catch(() => new Response("<!doctype html><title>XeroStreams offline</title><body style='background:#101114;color:white;font-family:sans-serif;padding:3rem'><h1>XeroStreams</h1><p>You are offline. Reconnect to continue streaming.</p><a style='color:#e7b62d' href='/'>Try again</a></body>", {headers:{"Content-Type":"text/html; charset=utf-8"}})));
});
self.addEventListener("notificationclick",event=>{event.notification.close();const path=event.notification.data?.link;const target=typeof path==="string"&&path.startsWith("/watch?id=")?path:"/dashboard";event.waitUntil(self.clients.openWindow(new URL(target,self.location.origin).href));});
