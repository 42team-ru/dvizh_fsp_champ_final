import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WifiOff } from "lucide-react";
import type { MeResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { getAuthMeUrl } from "@/shared/api/generated/core/auth/auth";
import { getEventsGetUrl, getEventsMineUrl } from "@/shared/api/generated/core/events/events";
import { getNotificationsListUrl, getNotificationsUnreadCountsUrl } from "@/shared/api/generated/core/notifications/notifications";
import { getRegistrationsMineUrl } from "@/shared/api/generated/core/registrations/registrations";
import { ACTIVITY_TYPES, REPLY_TYPES, TEAM_TYPES } from "@/entity/notification/model/use-unread-notifications";
import { lastOnline, markOnline } from "@/shared/lib/offline-cache";

/** Как часто освежать офлайн-копию, пока приложение открыто. */
const REFRESH_MS = 10 * 60_000;
/** Сколько ближайших записей сохранить вместе с карточками событий. */
const EVENTS_AHEAD = 10;

export function useOnline() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

const get = (url: string) => fetch(url, { credentials: "include" });

/**
 * Заранее запрашивает то, что нужно без сети: service worker сохраняет эти ответы.
 * Адреса совпадают с запросами экранов «Активность», «Главная» и «Мои мероприятия», иначе офлайн их не найдёт.
 */
async function prefetch(user: MeResponse) {
  const participant = user.systemRole === "USER";
  const urls = [
    getAuthMeUrl(),
    getNotificationsUnreadCountsUrl(),
    getNotificationsListUrl({ types: participant ? ACTIVITY_TYPES : [...REPLY_TYPES, ...TEAM_TYPES], size: 30 }),
  ];
  if (participant) {
    urls.push(
      getRegistrationsMineUrl({ status: "PENDING", when: "UPCOMING", size: 2 }),
      getRegistrationsMineUrl({ status: "CONFIRMED", when: "UPCOMING", size: 2 }),
      getRegistrationsMineUrl({ status: "CONFIRMED", size: 20 }),
    );
  } else {
    urls.push(getEventsMineUrl({ status: "PUBLISHED", size: 20 }));
  }
  await Promise.allSettled(urls.map(get));

  // карточки ближайших встреч: когда, где, приватные детали для участника
  const ahead = participant
    ? getRegistrationsMineUrl({ status: "CONFIRMED", when: "UPCOMING", size: 50 })
    : getEventsMineUrl({ when: "UPCOMING", size: EVENTS_AHEAD });
  const response = await get(ahead);
  if (!response.ok) return;
  // у записи событие вложено (MyRegistrationResponse.event), у своих мероприятий это сама строка
  const page = (await response.json()) as { items: { id: string; event?: { id: string } }[] };
  const ids = page.items.slice(0, EVENTS_AHEAD).map((i) => i.event?.id ?? i.id);
  await Promise.allSettled(ids.map((id) => get(getEventsGetUrl(id))));
  markOnline();
}

/** Держит офлайн-копию свежей, пока есть сеть. Работает только с service worker (production). */
export function OfflinePrefetch({ user }: { user: MeResponse }) {
  const online = useOnline();
  useEffect(() => {
    if (!online || !import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    const run = () => void prefetch(user).catch(() => undefined);
    const timer = window.setTimeout(run, 3000);
    const interval = window.setInterval(run, REFRESH_MS);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [online, user]);
  return null;
}

/** Плашка сверху без сети: данные сохранённые, действия недоступны. */
export function OfflineBanner() {
  const online = useOnline();
  const saved = lastOnline();
  const time = saved?.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          role="status"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          title="Записи, мероприятия и уведомления — сохранённые. Записаться и написать можно, когда сеть вернётся."
          className="fixed top-2 left-1/2 z-[60] flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-pill border-2 border-ink bg-sun px-3 py-1.5 text-foreground shadow-hard-sm"
        >
          <WifiOff className="size-4 shrink-0" />
          <p className="truncate text-xs font-extrabold">
            Нет сети · сохранённое{time ? ` на ${time}` : ""}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
