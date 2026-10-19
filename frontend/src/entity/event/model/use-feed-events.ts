import { useEventsList } from "@/shared/api/generated/core/events/events";
import { useRecommendationsEvents } from "@/shared/api/generated/core/recommendations/recommendations";
import type {
  EventSummaryResponse,
  EventsListParams,
  RecommendedEventResponse,
} from "@/shared/api/generated/core/appAPI.schemas";

/** Сколько рекомендаций показываем в ленте «Для вас». */
const FOR_YOU_SIZE = 20;

/**
 * События ленты: обычный events_list или, при чипе «Для вас», персональная подборка recommendations_events.
 * Карточки одинаковые; у рекомендаций дополнительно есть причины (reasonOf) — «почему вам это».
 */
export function useFeedEvents(params: EventsListParams, { forYou, ready }: { forYou: boolean; ready: boolean }) {
  const list = useEventsList(params, { query: { enabled: ready && !forYou } });
  const recommended = useRecommendationsEvents({ size: FOR_YOU_SIZE }, { query: { enabled: forYou } });
  const source = forYou ? recommended : list;
  const items: RecommendedEventResponse[] =
    forYou && recommended.data?.status === 200 ? recommended.data.data.items ?? [] : [];
  const events: EventSummaryResponse[] | undefined = forYou
    ? recommended.data?.status === 200 ? items.map((item) => item.event) : undefined
    : list.data?.status === 200 ? list.data.data : undefined;
  const byId = new Map(items.map((item) => [item.event.id, item]));
  return {
    events,
    isPending: source.isPending,
    isError: source.isError,
    /** Главная причина рекомендации; undefined — не из подборки. */
    reasonOf: (id: string) => byId.get(id)?.reasons[0]?.text,
  };
}
