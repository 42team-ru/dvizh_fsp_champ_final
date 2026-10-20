import { getEventsCalendarUrl } from "@/shared/api/generated/core/events/events";

/** Что кладём в чужой календарь. Приватные детали сюда не попадают: они есть только в .ics для участников. */
export type CalendarEvent = {
  eventId: string;
  title: string;
  /** Начало занятия: у серии — ближайшее, веб-календари добавляют только его. */
  startAt: string;
  endAt?: string;
  /** Адрес или «Онлайн». */
  location?: string;
  recurring: boolean;
};

/** Без конца встречи веб-календари всё равно требуют его — ставим час. */
const HOUR = 60 * 60 * 1000;
const endOf = (e: CalendarEvent) => e.endAt ?? new Date(Date.parse(e.startAt) + HOUR).toISOString();

/** 2026-10-20T16:00:00.000Z → 20261020T160000Z (формат Google). */
const compact = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const pageUrl = (e: CalendarEvent) => `${window.location.origin}/events/${e.eventId}`;
const details = (e: CalendarEvent) => `Подробности и запись: ${pageUrl(e)}`;

/** .ics с бэка: разовое — одно занятие, серия — все мои будущие занятия. */
export const icsUrl = (eventId: string) => getEventsCalendarUrl(eventId);

/** На Android ссылка открывается в приложении Google Календаря. */
export function googleCalendarUrl(e: CalendarEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${compact(e.startAt)}/${compact(endOf(e))}`,
    details: details(e),
  });
  if (e.location) params.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Outlook в браузере: live — личный (outlook.com), office — рабочий (Microsoft 365). */
export function outlookUrl(e: CalendarEvent, kind: "live" | "office") {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: new Date(e.startAt).toISOString(),
    enddt: new Date(endOf(e)).toISOString(),
    body: details(e),
  });
  if (e.location) params.set("location", e.location);
  return `https://outlook.${kind}.com/calendar/0/action/compose?${params}`;
}

/** Из карточки события (summary или полной) и времени занятия. */
export function calendarEventOf(
  e: { id: string; title: string; format: string; address?: string; recurring: boolean },
  startAt: string,
  endAt?: string,
): CalendarEvent {
  return {
    eventId: e.id, title: e.title, startAt, endAt, recurring: e.recurring,
    location: e.format === "ONLINE" ? "Онлайн" : e.address,
  };
}
