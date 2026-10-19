import { useQueryClient } from "@tanstack/react-query";
import {
  getEventsGetQueryKey,
  getEventsMineQueryKey,
  getEventsOrganizerInvitationsQueryKey,
  useEventsAcceptOrganizerInvite,
  useEventsDeclineOrganizerInvite,
  useEventsOrganizerInvitations,
} from "@/shared/api/generated/core/events/events";
import { getNotificationsListQueryKey } from "@/shared/api/generated/core/notifications/notifications";
import { Button } from "@/shared/components/ui/button";
import { toast } from "@/shared/lib/toast";
import { cn } from "cn";

/** Мероприятия, куда меня позвали в соорганизаторы и ждут ответа: по ним строки «Активности» получают кнопки. */
export function usePendingInvites() {
  const query = useEventsOrganizerInvitations({ query: { refetchInterval: 30_000 } });
  const items = query.data?.status === 200 ? query.data.data : [];
  return new Set(items.map((invite) => invite.eventId));
}

/**
 * «Принять» и «Отказаться» на приглашение в соорганизаторы. После ответа обновляются приглашения,
 * карточка мероприятия, «Мои события» и лента уведомлений.
 */
export function InviteActions({ eventId, className, compact }: { eventId: string; className?: string; compact?: boolean }) {
  const cache = useQueryClient();
  const refresh = () => Promise.all([
    cache.invalidateQueries({ queryKey: getEventsOrganizerInvitationsQueryKey() }),
    cache.invalidateQueries({ queryKey: getEventsGetQueryKey(eventId) }),
    cache.invalidateQueries({ queryKey: getEventsMineQueryKey() }),
    cache.invalidateQueries({ queryKey: getNotificationsListQueryKey() }),
  ]);
  const onError = (error: { detail?: string }) => toast.error("Не получилось", { description: error.detail ?? "Попробуйте ещё раз" });
  const accept = useEventsAcceptOrganizerInvite({ mutation: {
    onSuccess: () => { toast.success("Вы в команде организаторов"); void refresh(); },
    onError,
  } });
  const decline = useEventsDeclineOrganizerInvite({ mutation: {
    onSuccess: () => { toast.info("Приглашение отклонено"); void refresh(); },
    onError,
  } });
  const busy = accept.isPending || decline.isPending;
  const size = compact ? "h-10 px-4 text-xs" : "h-11 px-5 text-sm";
  return (
    <div className={cn("flex shrink-0 gap-2", className)}>
      <Button variant="ink" className={size} disabled={busy} onClick={() => accept.mutate({ id: eventId })}>Принять</Button>
      <Button variant="soft" className={size} disabled={busy} onClick={() => decline.mutate({ id: eventId })}>Отказаться</Button>
    </div>
  );
}
