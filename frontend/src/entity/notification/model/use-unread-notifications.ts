import { useNotificationsUnreadCounts } from "@/shared/api/generated/core/notifications/notifications";
import type { NotificationsListTypesItem } from "@/shared/api/generated/core/appAPI.schemas";

export const REPLY_TYPES: NotificationsListTypesItem[] = ["COMMENT_REPLY", "COMMENT_CREATED"];
export const ACHIEVEMENT_TYPES: NotificationsListTypesItem[] = ["ACHIEVEMENT_UNLOCKED"];
export const REMINDER_TYPES: NotificationsListTypesItem[] = ["REMINDER"];
/** Типы, которые показывает «Активность»: по ним же считается счётчик на кнопке в навигации. */
export const ACTIVITY_TYPES: NotificationsListTypesItem[] = [...REPLY_TYPES, ...ACHIEVEMENT_TYPES, ...REMINDER_TYPES];

/**
 * Непрочитанные уведомления «Активности»: по типам и всего. Один запрос на шапку, нижнее меню и страницу,
 * обновляется раз в 30 секунд и сразу после «прочитать» (страница сбрасывает этот кэш).
 */
export function useUnreadNotifications() {
  const counts = useNotificationsUnreadCounts({ query: { refetchInterval: 30_000 } });
  const byType = new Map((counts.data?.status === 200 ? counts.data.data : []).map((c) => [c.type, c.unread]));
  const unreadOf = (types: NotificationsListTypesItem[]) => types.reduce((sum, t) => sum + (byType.get(t) ?? 0), 0);
  return { unreadOf, total: unreadOf(ACTIVITY_TYPES) };
}
