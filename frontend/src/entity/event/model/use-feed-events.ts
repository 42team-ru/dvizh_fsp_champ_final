import { useInfiniteQuery } from "@tanstack/react-query";
import { eventsList, getEventsListQueryKey } from "@/shared/api/generated/core/events/events";
import { useUsersMyPreferences } from "@/shared/api/generated/core/users/users";
import { formatDistance } from "./use-recommendation-preview";
import { recommendationsEvents, getRecommendationsEventsQueryKey } from "@/shared/api/generated/core/recommendations/recommendations";
import type {
  EventSummaryResponse,
  EventsListParams,
  RecommendedEventResponse,
  RecommendationsEventsParams,
} from "@/shared/api/generated/core/appAPI.schemas";

const EARTH_RADIUS_KM = 6371;

/** Расстояние по прямой между двумя точками, км (формула гаверсинусов, как в Geo на бэке). */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Единый размер страницы обычной и персональной ленты. */
const PAGE_SIZE = 24;
/** Сколько лучших рекомендаций выделяем фиолетовой причиной со звёздочками, как на главной. */
const TOP_PICKS = 3;

/**
 * События ленты: обычный events_list или, при чипе «Для вас», персональная подборка recommendations_events.
 * Карточки одинаковые; у рекомендаций дополнительно есть причины (reasonOf) — «почему вам это».
 */
export function useFeedEvents(params: EventsListParams, { forYou, ready }: { forYou: boolean; ready: boolean }) {
  const listParams = { ...params, size: PAGE_SIZE };
  const recommendationParams: RecommendationsEventsParams = {
    sportId: params.sportId, from: params.from, to: params.to,
    lat: params.lat, lon: params.lon, radiusKm: params.radiusKm, size: PAGE_SIZE,
  };
  const list = useInfiniteQuery({
    queryKey: [...getEventsListQueryKey(listParams), "infinite"],
    queryFn: async ({ pageParam, signal }) => (await eventsList({ ...listParams, page: pageParam }, { signal })).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = (lastPage.page ?? 0) + 1;
      return next < (lastPage.totalPages ?? 0) ? next : undefined;
    },
    enabled: ready && !forYou,
  });
  const recommended = useInfiniteQuery({
    queryKey: [...getRecommendationsEventsQueryKey(recommendationParams), "infinite", params],
    queryFn: async ({ pageParam, signal }) => {
      const response = await recommendationsEvents({ ...recommendationParams, page: pageParam }, { signal });
      if (response.status !== 200) throw new Error("Не удалось загрузить подборку");
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = (lastPage.page ?? 0) + 1;
      return next < (lastPage.totalPages ?? 0) ? next : undefined;
    },
    enabled: ready && forYou,
  });
  const preferences = useUsersMyPreferences();
  const home = preferences.data?.status === 200 ? preferences.data.data.home : undefined;
  const source = forYou ? recommended : list;
  // Подборка не умеет фильтры «Ещё»: уровень, режим записи и формат отсекаем на месте, так же строго, как лента.
  const matchesExtra = (e: EventSummaryResponse) =>
    (!params.level || e.level === params.level)
    && (!params.joinMode || e.joinMode === params.joinMode)
    && (!params.format || e.format === params.format);
  const items: RecommendedEventResponse[] =
    forYou ? (recommended.data?.pages.flatMap((page) => page.items ?? []) ?? []).filter((item) => matchesExtra(item.event)) : [];
  const filteredLocally = forYou && Boolean(params.level || params.joinMode || params.format);
  const events: EventSummaryResponse[] | undefined = forYou
    ? recommended.data ? items.map((item) => item.event) : undefined
    : list.data?.pages.flatMap((page) => page.items ?? []);
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
    totalElements: filteredLocally ? items.length : source.data?.pages[0]?.totalElements,
    hasNextPage: source.hasNextPage,
    isFetching: source.isFetching,
    isFetchingNextPage: source.isFetchingNextPage,
    isFetchNextPageError: source.isFetchNextPageError,
    fetchNextPage: source.fetchNextPage,
    placeOf,
    isPending: source.isPending,
    isError: source.isError,
    /** Главная причина рекомендации; undefined — не из подборки. */
    reasonOf: (id: string) => byId.get(id)?.reasons[0]?.text,
    /** Причина только у самых подходящих (подборка уже отсортирована по score); у остальных undefined. */
    topReasonOf: (id: string) => (top.has(id) ? byId.get(id)?.reasons[0]?.text : undefined),
  };
}
