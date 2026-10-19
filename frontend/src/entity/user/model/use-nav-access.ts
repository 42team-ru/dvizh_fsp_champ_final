import { useNotificationsUnreadCounts } from "@/shared/api/generated/core/notifications/notifications";
import { useUser } from "./use-user";

/**
 * Какие разделы меню нужны роли. «Профиль» — паспорт спортсмена с питомцем и монетами, он есть только у участника;
 * клубу остаются «Активность» (вопросы в обсуждениях) и «Кабинет», админу — главная и лента.
 * Счётчик «Активности» — настоящие непрочитанные уведомления, а не цифра из макета.
 */
export function useNavAccess() {
  const { user } = useUser();
  const role = user?.systemRole;
  const showActivity = role === "USER" || role === "ORG";
  const counts = useNotificationsUnreadCounts({ query: { enabled: showActivity, refetchInterval: 30_000 } });
  const unread = counts.data?.status === 200 ? counts.data.data.reduce((sum, c) => sum + c.unread, 0) : 0;
  return {
    showActivity,
    showProfile: role === "USER",
    canCreate: role === "USER" || role === "ORG",
    isAdmin: role === "ADMIN",
    unread,
  };
}
