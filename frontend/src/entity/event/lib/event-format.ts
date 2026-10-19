import type { EventSummaryResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { EVENT_LEVEL_LABEL } from "@/shared/lib/statuses";
import type { EventCardData, EventCover } from "@/widgets/event-card/ui/event-card";

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** «Сегодня 19:30», «Завтра 18:00», «Сб 16:00» (в ближайшую неделю), иначе «21 окт 18:00». Время пользователя. */
export function formatWhen(iso: string, now = new Date()) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(date, now)) return `Сегодня ${time}`;
  if (sameDay(date, tomorrow)) return `Завтра ${time}`;
  const days = (date.getTime() - now.getTime()) / 86_400_000;
  if (days > 0 && days < 6) return `${WEEKDAYS[date.getDay()]} ${time}`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${time}`;
}

/** Мероприятие из API → данные карточки ленты. Обложка: фото события, иначе оформление слота сетки. */
export function toCardData(event: EventSummaryResponse, fallbackCover: EventCover): EventCardData {
  const going = event.occurrenceAttendeesCount ?? event.participantsCount;
  const almostFull = event.capacity != null && going / event.capacity >= 0.8;
  return {
    sport: event.sport.name,
    time: formatWhen(event.startAt),
    distance: event.format === "ONLINE" ? "Онлайн" : event.address ?? "Место уточняется",
    title: event.title,
    place: [event.scheduleDescription, EVENT_LEVEL_LABEL[event.level]].filter(Boolean).join(" · "),
    people: Array.from({ length: Math.min(3, going) }, () => ""),
    going,
    total: event.capacity ?? undefined,
    tone: almostFull ? "warning" : "default",
    cover: event.coverUrl ? { photo: event.coverUrl } : fallbackCover,
  };
}
