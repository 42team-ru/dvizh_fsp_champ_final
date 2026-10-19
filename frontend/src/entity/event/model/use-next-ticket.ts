import { useRegistrationsMine } from "@/shared/api/generated/core/registrations/registrations";
import type { MyRegistrationResponse } from "@/shared/api/generated/core/appAPI.schemas";

/** Когда моё следующее занятие: у серии — ближайшая дата, у разового — начало. */
export const nextStartOf = (r: MyRegistrationResponse) => r.myNextOccurrence?.startAt ?? r.event.startAt;

/**
 * Ближайшая подтверждённая встреча для «Дальше у тебя» на главной.
 * Сервер отдаёт записи новыми сверху, поэтому берём страницу целиком и сортируем по времени занятия сами;
 * отменённые организатором и снятые с публикации пропускаем.
 */
export function useNextTicket() {
  const query = useRegistrationsMine({ status: "CONFIRMED", when: "UPCOMING", size: 100 });
  const now = Date.now();
  const ticket = (query.data?.status === 200 ? query.data.data.items ?? [] : [])
    .filter((r) => r.event.status === "PUBLISHED" && !r.event.cancelledByOrganizer)
    .filter((r) => new Date(nextStartOf(r)).getTime() > now)
    .sort((a, b) => new Date(nextStartOf(a)).getTime() - new Date(nextStartOf(b)).getTime())[0];
  return { ticket, isPending: query.isPending };
}

/** «через 40 мин», «через 3 ч», «завтра», «через 5 дн.» — сколько осталось до встречи. */
export function untilLabel(iso: string, now = new Date()) {
  const minutes = Math.round((new Date(iso).getTime() - now.getTime()) / 60_000);
  if (minutes < 60) return `через ${Math.max(1, minutes)} мин`;
  if (minutes < 24 * 60) return `через ${Math.round(minutes / 60)} ч`;
  const days = Math.round(minutes / (24 * 60));
  return days === 1 ? "завтра" : `через ${days} дн.`;
}
