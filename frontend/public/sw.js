// prepare-pwa.mjs добавляет ресурсы сборки и хеш содержимого после react-router build.
const CACHE_VERSION = "v1";
const CACHE_PREFIX = "dvizh-pwa-";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
/** Личные ответы API для офлайна: живут между версиями приложения, чистятся при входе и выходе. */
const API_CACHE = `${CACHE_PREFIX}api`;
/** Заголовок с моментом сохранения: по нему приложение пишет «данные от 14:05». */
const SAVED_AT = "X-Dvizh-Saved-At";
const UUID = "[0-9a-f-]{36}";
/** Что доступно без сети: профиль, мои записи и мероприятия, уведомления и карточки событий. */
const OFFLINE_API = [
  /^\/api\/auth\/me$/,
  /^\/api\/registrations\/mine$/,
  /^\/api\/events\/mine$/,
  /^\/api\/notifications$/,
  /^\/api\/notifications\/unread-counts$/,
  new RegExp(`^/api/events/${UUID}$`),
  new RegExp(`^/api/events/${UUID}/(occurrences|comments)$`),
];
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
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME && key !== API_CACHE)
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
  return await cache.match("/index.html", { ignoreVary: true }) ?? new Response(`<!doctype html>
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
  // Модульные скрипты приходят с заголовком Origin, а сервер отвечает с Vary: Origin —
  // без ignoreVary предкэш не находится и без сети не открывается ни одна страница.
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
  return response;
}

/**
 * Сеть в приоритете: свежий ответ 200 сохраняем, а без сети отдаём сохранённый с пометкой времени.
 * Ошибки сервера (401, 404, 409) не подменяем кэшем — они означают, что сеть есть.
 */
async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const headers = new Headers(response.headers);
      headers.set(SAVED_AT, new Date().toISOString());
      const body = await response.clone().blob();
      await cache.put(request, new Response(body, { status: 200, statusText: "OK", headers }));
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "clear-api-cache") event.waitUntil(caches.delete(API_CACHE));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    // Остальной API, cookie-авторизацию и сторонние сервисы (включая 2ГИС) не перехватываем.
    if (OFFLINE_API.some((pattern) => pattern.test(url.pathname))) event.respondWith(networkFirstApi(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigate(request));
  } else if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/fonts/") ||
      SHELL.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
