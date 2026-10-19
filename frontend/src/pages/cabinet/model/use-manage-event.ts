import { useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { getEventsGetQueryKey, getEventsMineQueryKey, useEventsGet } from "@/shared/api/generated/core/events/events";
import { getRegistrationsListForEventQueryKey } from "@/shared/api/generated/core/registrations/registrations";
import { getOccurrencesListQueryKey } from "@/shared/api/generated/core/occurrences/occurrences";

/** Мероприятие в кабинете и общий «обновить всё», который зовут вкладки после действий. */
export function useManageEvent() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const query = useEventsGet(id);
  const event = query.data?.status === 200 ? query.data.data : undefined;

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getEventsGetQueryKey(id) }),
      queryClient.invalidateQueries({ queryKey: getRegistrationsListForEventQueryKey(id) }),
      queryClient.invalidateQueries({ queryKey: getOccurrencesListQueryKey(id) }),
      queryClient.invalidateQueries({ queryKey: getEventsMineQueryKey() }),
    ]);

  return { id, query, event, refresh };
}

export type ManagedEvent = NonNullable<ReturnType<typeof useManageEvent>["event"]>;
