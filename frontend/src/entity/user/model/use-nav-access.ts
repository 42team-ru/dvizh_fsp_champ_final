import { useUnreadNotifications } from "@/entity/notification/model/use-unread-notifications";
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
  // все непрочитанные, как вкладка «Все» в «Активности»: число в меню совпадает с «N новых» на ней
  const counts = useUnreadNotifications(showActivity);
  const unread = counts.all;
  return {
    showActivity,
    showProfile: role === "USER",
    canCreate: role === "USER" || role === "ORG",
    isAdmin: role === "ADMIN",
    unread,
  };
}
