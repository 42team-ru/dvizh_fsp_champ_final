import { useEventsMine } from "@/shared/api/generated/core/events/events";
import { useUser } from "./use-user";

/**
 * Кабинет организатора открыт аккаунту организации и человеку, у которого есть свои мероприятия
 * (автор или соорганизатор). Админ событий не ведёт — ему кабинет не нужен.
 */
export function useCabinetAccess() {
  const { user } = useUser();
  const role = user?.systemRole;
  const mine = useEventsMine({ size: 1 }, { query: { enabled: role === "USER" || role === "ORG" } });
  const total = mine.data?.status === 200 ? mine.data.data.totalElements ?? 0 : 0;
  return {
    allowed: role === "ORG" || (role === "USER" && total > 0),
    isOrg: role === "ORG",
    /** Сколько мероприятий я веду — счётчик в меню кабинета. */
    eventsCount: total,
    loading: !user || ((role === "USER" || role === "ORG") && mine.isLoading),
  };
}
