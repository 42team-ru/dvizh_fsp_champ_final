// prepare-pwa.mjs добавляет ресурсы сборки и хеш содержимого после react-router build.
const CACHE_VERSION = "v1";
const CACHE_PREFIX = "dvizh-pwa-";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const BUILD_ASSETS = [];
const SHELL = [
  "/", "/index.html", "/manifest.webmanifest", "/icon.svg",
  "/icons/icon-192.png", "/icons/icon-512.png",
  "/icons/icon-maskable-512.png", "/icons/apple-touch-icon.png",
  "/fonts/manrope-latin.woff2", "/fonts/manrope-cyrillic.woff2",
  "/fonts/unbounded-latin.woff2", "/fonts/unbounded-cyrillic.woff2",
  "/fonts/ibm-plex-mono-latin.woff2",
  ...BUILD_ASSETS,
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...new Set(SHELL)].map((url) => new Request(url, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function navigate(request) {
  try {
    const response = await fetch(request);
    if (response.ok) return response;
  } catch {
    // SPA-оболочка общая для всех маршрутов; личные ответы здесь не сохраняются.
  }
  const cache = await caches.open(CACHE_NAME);
  return await cache.match("/index.html") ?? new Response(`<!doctype html>
<html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Нет сети — Движ</title><body><h1>Нет сети</h1>
<p>Проверьте подключение к интернету и обновите страницу.</p>
<button onclick="location.reload()">Повторить</button></body></html>`, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Никогда не перехватываем API, cookie-авторизацию и сторонние сервисы (включая 2ГИС).
  if (request.method !== "GET" || url.origin !== self.location.origin ||
      url.pathname === "/api" || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(request));
  } else if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/fonts/") ||
      SHELL.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
