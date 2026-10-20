import { useRegistrationsMine } from "@/shared/api/generated/core/registrations/registrations";
import { useEventsMine } from "@/shared/api/generated/core/events/events";
import type { EventSummaryResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { useUser } from "@/entity/user/model/use-user";
import { plural } from "@/shared/lib/plural";

export type NextTicket = {
  event: EventSummaryResponse;
  /** Начало ближайшего занятия: у серии — моя отметка, иначе ближайшее занятие события. */
  startAt: string;
  endAt?: string;
  /** Иду как участник или веду как организатор. */
  role: "participant" | "organizer";
};

const alive = (e: EventSummaryResponse) => e.status === "PUBLISHED" && !e.cancelledByOrganizer;

/**
 * Ближайшая встреча для главной: подтверждённая запись (у серии — отмеченное занятие),
 * а если записей нет — ближайшее мероприятие, которое я веду. Списки отсортированы по дате создания,
 * поэтому ближайшее по времени выбираем сами.
 */
export function useNextTicket() {
  const { user } = useUser();
  const role = user?.systemRole;
  const regs = useRegistrationsMine(
    { status: "CONFIRMED", when: "UPCOMING", size: 50 },
    { query: { enabled: role === "USER" } },
  );
  const hosted = useEventsMine(
    { status: "PUBLISHED", when: "UPCOMING", size: 50 },
    { query: { enabled: role === "USER" || role === "ORG" } },
  );

  const now = Date.now();
  const candidates: NextTicket[] = [
    ...(regs.data?.status === 200 ? regs.data.data.items ?? [] : [])
      .filter((r) => alive(r.event))
      .map((r) => ({
        event: r.event,
        startAt: r.myNextOccurrence?.startAt ?? r.event.startAt,
        endAt: r.myNextOccurrence?.endAt ?? r.event.endAt,
        role: "participant" as const,
      })),
    ...(hosted.data?.status === 200 ? hosted.data.data.items ?? [] : [])
      .filter(alive)
      .map((e) => ({ event: e, startAt: e.startAt, endAt: e.endAt, role: "organizer" as const })),
  ].filter((t) => new Date(t.endAt ?? t.startAt).getTime() > now);

  // участие важнее своих мероприятий только при равном времени; в остальном — кто раньше
  const next = candidates.sort((a, b) => a.startAt.localeCompare(b.startAt))[0];

  return {
    user,
    next,
    isLoading: !user || (role === "USER" && regs.isLoading) || ((role === "USER" || role === "ORG") && hosted.isLoading),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");
export const clock = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** «Сегодня, 19:30», «Завтра, 09:00», «Пт, 24 окт, 18:00». */
export function ticketDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const days = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000,
  );
  const day = days === 0 ? "Сегодня" : days === 1 ? "Завтра"
    : d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" }).replace(".", "");
  return `${day[0].toUpperCase()}${day.slice(1)}, ${clock(iso)}`;
}

/** «через 2 часа», «через 3 дня» — до начала. */
export function untilStart(iso: string) {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (minutes <= 0) return "уже идёт";
  if (minutes < 60) return `через ${minutes} мин`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `через ${hours} ${plural(hours, ["час", "часа", "часов"])}`;
  return ticketDay(iso);
}

/** Ссылка «Как добраться» в 2ГИС по адресу. */
export const routeUrl = (address: string) => `https://2gis.ru/search/${encodeURIComponent(address)}`;
