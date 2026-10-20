import { useNotificationsUnreadCounts } from "@/shared/api/generated/core/notifications/notifications";
import type { NotificationsListTypesItem } from "@/shared/api/generated/core/appAPI.schemas";

export const REPLY_TYPES: NotificationsListTypesItem[] = ["COMMENT_REPLY", "COMMENT_CREATED"];
export const ACHIEVEMENT_TYPES: NotificationsListTypesItem[] = ["ACHIEVEMENT_UNLOCKED"];
export const CLUB_TYPES: NotificationsListTypesItem[] = ["ORG_NEW_EVENT"];
export const REMINDER_TYPES: NotificationsListTypesItem[] = ["REMINDER"];
/** Объявления и изменения по встречам: слово организатора, перенос, отмена, снятие, новые встречи клубов. */
export const ANNOUNCEMENT_TYPES: NotificationsListTypesItem[] = [
  "EVENT_ANNOUNCEMENT", "EVENT_CHANGED", "OCCURRENCE_RESCHEDULED", "OCCURRENCE_CANCELLED",
  "EVENT_UNPUBLISHED", "EVENT_DELETED", "EVENT_RESTORED", "ORG_NEW_EVENT",
];
/** Команда организаторов: приглашение (с кнопками «Принять» / «Отказаться»), принятие и отказ. */
export const TEAM_TYPES: NotificationsListTypesItem[] = ["ORGANIZER_INVITED", "ORGANIZER_ADDED", "ORGANIZER_INVITE_DECLINED"];
/** Типы, которые показывает «Активность»: по ним же считается счётчик на кнопке в навигации. */
export const ACTIVITY_TYPES: NotificationsListTypesItem[] = [...REPLY_TYPES, ...ACHIEVEMENT_TYPES, ...REMINDER_TYPES, ...TEAM_TYPES, ...CLUB_TYPES];
/** Организатору: новые записи и отмены. */
export const HOST_REGISTRATION_TYPES: NotificationsListTypesItem[] = ["REGISTRATION_CREATED", "REGISTRATION_CANCELLED"];
/** Организатору: кворум набран, потерян, занятие подтверждено. */
export const QUORUM_TYPES: NotificationsListTypesItem[] = ["QUORUM_REACHED", "QUORUM_LOST", "OCCURRENCE_CONFIRMED"];

/**
 * Непрочитанные уведомления «Активности»: по типам и всего. Один запрос на шапку, нижнее меню и страницу,
 * обновляется раз в 30 секунд и сразу после «прочитать» (страница сбрасывает этот кэш).
 */
export function useUnreadNotifications(enabled = true) {
  const counts = useNotificationsUnreadCounts({ query: { enabled, refetchInterval: 30_000 } });
  const byType = new Map((counts.data?.status === 200 ? counts.data.data : []).map((c) => [c.type, c.unread]));
  const unreadOf = (types: NotificationsListTypesItem[]) => types.reduce((sum, t) => sum + (byType.get(t) ?? 0), 0);
  /** Все непрочитанные, любых типов: столько показывает вкладка «Все» в «Активности». */
  const all = [...byType.values()].reduce((sum, n) => sum + n, 0);
  return { unreadOf, total: unreadOf(ACTIVITY_TYPES), all };
}
