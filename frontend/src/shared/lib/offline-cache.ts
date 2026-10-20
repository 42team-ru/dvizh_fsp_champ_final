/** Кэш личных ответов API в service worker (см. `API_CACHE` в public/sw.js). */
const API_CACHE = "dvizh-pwa-api";
const LAST_ONLINE_KEY = "dvizh-last-online";

/** Стирает сохранённые для офлайна данные: при входе и выходе, чтобы следующий аккаунт не увидел чужое. */
export async function clearOfflineCache() {
  if (typeof caches === "undefined") return;
  await caches.delete(API_CACHE).catch(() => false);
  try {
    localStorage.removeItem(LAST_ONLINE_KEY);
  } catch {
    // хранилище недоступно (приватный режим) — подпись «данные от» просто не покажется
  }
}

/** Запоминает момент, когда данные последний раз обновлялись из сети. */
export function markOnline() {
  try {
    localStorage.setItem(LAST_ONLINE_KEY, new Date().toISOString());
  } catch {
    // см. выше
  }
}

export function lastOnline(): Date | undefined {
  try {
    const value = localStorage.getItem(LAST_ONLINE_KEY);
    return value ? new Date(value) : undefined;
  } catch {
    return undefined;
  }
}
