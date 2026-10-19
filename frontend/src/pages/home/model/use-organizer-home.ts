import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useEventsMine } from "@/shared/api/generated/core/events/events";
import { getOccurrencesListQueryOptions } from "@/shared/api/generated/core/occurrences/occurrences";
import { getRegistrationsListForEventQueryOptions } from "@/shared/api/generated/core/registrations/registrations";
import type { EventSummaryResponse, OccurrenceResponse } from "@/shared/api/generated/core/appAPI.schemas";

const DAY = 86_400_000;
/** Сколько недель истории берём для «Посещаемости серий» (до 8 прошедших занятий). */
const HISTORY_DAYS = 56;
/** Больше мероприятий главная не разворачивает по занятиям: дальше — кабинет. */
const MAX_EVENTS = 12;

export type WeekSlot = { event: EventSummaryResponse; occurrence: OccurrenceResponse };
export type SeriesStat = { event: EventSummaryResponse; past: number[]; avg: number; capacity?: number; trend: number };

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Данные главной организатора: ближайшие мероприятия, их занятия на неделю вперёд и 8 недель назад,
 * заявки, ждущие решения. Всё — из тех же эндпоинтов, что кабинет, без отдельного API.
 */
export function useOrganizerHome() {
  const upcoming = useEventsMine({ when: "UPCOMING", status: "PUBLISHED", size: 100 });
  const past = useEventsMine({ when: "PAST", size: 3 });
  const events = useMemo(
    () => (upcoming.data?.status === 200 ? upcoming.data.data.items ?? [] : []).filter((e) => !e.cancelledByOrganizer),
    [upcoming.data],
  );
  const pastEvents = past.data?.status === 200 ? past.data.data.items ?? [] : [];
  const shown = events.slice(0, MAX_EVENTS);

  const today = startOfDay(new Date());
  const from = new Date(today.getTime() - HISTORY_DAYS * DAY).toISOString();
  const to = new Date(today.getTime() + 7 * DAY).toISOString();

  const occurrences = useQueries({
    queries: shown.map((e) => getOccurrencesListQueryOptions(e.id, { from, to })),
  });
  const pendingLists = useQueries({
    queries: shown.map((e) => ({
      ...getRegistrationsListForEventQueryOptions(e.id, { status: "PENDING" }),
      enabled: e.joinMode === "REQUEST",
    })),
  });

  const now = Date.now();
  const byEvent = shown.map((event, i) => {
    const res = occurrences[i]?.data;
    const list = res?.status === 200 ? res.data : [];
    const pendingRes = pendingLists[i]?.data;
    const pending = pendingRes?.status === 200 ? pendingRes.data.length : 0;
    return { event, list, pending };
  });

  // Неделя вперёд от сегодняшнего дня: занятия по дням, отменённые тоже показываем.
  const week: WeekSlot[] = byEvent
    .flatMap(({ event, list }) => list.filter((o) => new Date(o.startAt).getTime() >= today.getTime()).map((occurrence) => ({ event, occurrence })))
    .sort((a, b) => a.occurrence.startAt.localeCompare(b.occurrence.startAt));

  // Ближайшее не отменённое и не начавшееся занятие — герой главной.
  const next = week.find((s) => s.occurrence.status === "SCHEDULED" && new Date(s.occurrence.startAt).getTime() > now);

  // Посещаемость серий: отметки на прошедших занятиях, тренд — последнее против среднего.
  const series: SeriesStat[] = byEvent
    .filter(({ event }) => event.recurring)
    .map(({ event, list }) => {
      const past = list
        .filter((o) => o.status === "SCHEDULED" && new Date(o.startAt).getTime() < now)
        .slice(-8)
        .map((o) => o.attendeesCount);
      const avg = past.length ? Math.round(past.reduce((s, n) => s + n, 0) / past.length) : 0;
      const trend = past.length > 1 ? past[past.length - 1] - Math.round(past.slice(0, -1).reduce((s, n) => s + n, 0) / (past.length - 1)) : 0;
      return { event, past, avg, capacity: event.capacity, trend };
    })
    .filter((s) => s.past.length > 0)
    .slice(0, 4);

  const pendingTotal = byEvent.reduce((s, e) => s + e.pending, 0);
  const busiest = byEvent.filter((e) => e.pending > 0).sort((a, b) => b.pending - a.pending)[0];
  const weekScheduled = week.filter((s) => s.occurrence.status === "SCHEDULED");

  return {
    isLoading: upcoming.isPending,
    events,
    pastEvents,
    week,
    next,
    series,
    pendingTotal,
    busiest,
    pendingByEvent: Object.fromEntries(byEvent.map((e) => [e.event.id, e.pending])),
    weekCount: weekScheduled.length,
    weekSeries: new Set(weekScheduled.filter((s) => s.event.recurring).map((s) => s.event.id)).size,
    weekAttendees: weekScheduled.reduce((s, w) => s + w.occurrence.attendeesCount, 0),
  };
}
