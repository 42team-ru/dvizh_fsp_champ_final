import { useEventsList } from "@/shared/api/generated/core/events/events";
import { useUsersMyPreferences } from "@/shared/api/generated/core/users/users";
import { formatDistance } from "./use-recommendation-preview";
import { useRecommendationsEvents } from "@/shared/api/generated/core/recommendations/recommendations";
import type {
  EventSummaryResponse,
  EventsListParams,
  RecommendedEventResponse,
} from "@/shared/api/generated/core/appAPI.schemas";

const EARTH_RADIUS_KM = 6371;

/** Расстояние по прямой между двумя точками, км (формула гаверсинусов, как в Geo на бэке). */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Сколько рекомендаций показываем в ленте «Для вас». */
const FOR_YOU_SIZE = 20;
/** Сколько лучших рекомендаций выделяем фиолетовой причиной со звёздочками, как на главной. */
const TOP_PICKS = 3;

/**
 * События ленты: обычный events_list или, при чипе «Для вас», персональная подборка recommendations_events.
 * Карточки одинаковые; у рекомендаций дополнительно есть причины (reasonOf) — «почему вам это».
 */
export function useFeedEvents(params: EventsListParams, { forYou, ready }: { forYou: boolean; ready: boolean }) {
  const list = useEventsList(params, { query: { enabled: ready && !forYou } });
  const recommended = useRecommendationsEvents({ size: FOR_YOU_SIZE }, { query: { enabled: forYou } });
  const preferences = useUsersMyPreferences();
  const home = preferences.data?.status === 200 ? preferences.data.data.home : undefined;
  const source = forYou ? recommended : list;
  const items: RecommendedEventResponse[] =
    forYou && recommended.data?.status === 200 ? recommended.data.data.items ?? [] : [];
  const events: EventSummaryResponse[] | undefined = forYou
    ? recommended.data?.status === 200 ? items.map((item) => item.event) : undefined
    : list.data?.status === 200 ? list.data.data : undefined;
  const byId = new Map(items.map((item) => [item.event.id, item]));
  const top = new Set(items.slice(0, TOP_PICKS).map((item) => item.event.id));
  /** «450 м» / «1,2 км» до точки сбора; онлайн — «Онлайн», нет точки отсчёта — адрес. */
  const placeOf = (e: EventSummaryResponse) => {
    if (e.format === "ONLINE") return "Онлайн";
    const km = byId.get(e.id)?.distanceKm
      ?? (home && e.lat != null && e.lon != null ? haversineKm(home.lat, home.lon, e.lat, e.lon) : null);
    return formatDistance(km) ?? e.address ?? "Место уточняется";
  };
  return {
    events,
    placeOf,
    isPending: source.isPending,
    isError: source.isError,
    /** Главная причина рекомендации; undefined — не из подборки. */
    reasonOf: (id: string) => byId.get(id)?.reasons[0]?.text,
    /** Причина только у самых подходящих (подборка уже отсортирована по score); у остальных undefined. */
    topReasonOf: (id: string) => (top.has(id) ? byId.get(id)?.reasons[0]?.text : undefined),
  };
}
