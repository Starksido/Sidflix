/* Only the public offline shell is cached. Account APIs and video bytes never enter this cache. */
const CACHE = "sidflix-downloads-shell-v1";
const SHELL = "/sidflix-offline-downloads.html";
const ASSETS = [SHELL, "/brand/sidflix-greek-sky.png", "/media-downloads/big-buck-bunny.jpg", "/media-downloads/caminandes-llamigos.jpg", "/media-downloads/caminandes-llama-drama.jpg"];
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE); await cache.addAll(ASSETS.slice(0, 2));
    await Promise.allSettled(ASSETS.slice(2).map(url => cache.add(url))); await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys(); await Promise.all(keys.filter(key => key.startsWith("sidflix-downloads-shell-") && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate" && ["/downloads", SHELL].includes(url.pathname)) {
    event.respondWith((async () => {
      try { const response = await fetch(event.request); if (response.status < 500) return response; } catch {}
      return await caches.match(SHELL) || new Response("Reconnect to open Downloads.", { status: 503 });
    })());
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then(response => response || fetch(event.request)));
  }
});
