import { useRecommendationsEvents } from "@/shared/api/generated/core/recommendations/recommendations";
import type { RecommendedEventResponse } from "@/shared/api/generated/core/appAPI.schemas";

/** Ссылка «смотреть все» с главной: лента сразу открывается на чипе «Для вас». */
export const FOR_YOU_FEED_URL = "/feed?chip=for-you";

/** Первые рекомендации для превью на главной («Подобрали для тебя»). */
export function useRecommendationPreview(limit = 3) {
  const query = useRecommendationsEvents({ size: limit });
  const items: RecommendedEventResponse[] = query.data?.status === 200 ? query.data.data.items ?? [] : [];
  return { items, isPending: query.isPending, isError: query.isError };
}

/** «450 м» / «1,2 км»; null — онлайн или точка отсчёта неизвестна. */
export function formatDistance(km: number | undefined | null): string | null {
  if (km == null) return null;
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} м`;
  return `${km.toFixed(1).replace(".", ",")} км`;
}
