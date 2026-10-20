import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useSportsSearch } from "@/shared/api/generated/core/sports/sports";
import type { EventsListParams } from "@/shared/api/generated/core/appAPI.schemas";

/** Фильтры кнопки «Ещё»: добавляются к выбранному чипу. */
export type FeedExtra = Pick<EventsListParams, "level" | "joinMode" | "format" | "forMe">;

/** Чип персональной подборки: данные идут из recommendations_events, а не из events_list. */
export const FOR_YOU_CHIP = "Для вас";

/** Чипы ленты: «Для вас», «Все», два периода и виды спорта (по названию из справочника). */
export const FEED_CHIPS = [FOR_YOU_CHIP, "Все", "Сегодня", "Выходные", "Бег", "Футбол", "Йога", "Шахматы"] as const;
export type FeedChip = (typeof FEED_CHIPS)[number];

/** Период чипа в часовом поясе пользователя, в API — ISO (UTC). */
function period(chip: FeedChip): Pick<EventsListParams, "from" | "to"> {
  const now = new Date();
  if (chip === "Сегодня") {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { to: end.toISOString() };
  }
  if (chip === "Выходные") {
    const day = now.getDay(); // 0 — воскресенье
    const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (day === 0 ? -1 : 6 - day));
    const monday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 2);
    return { from: (saturday > now ? saturday : now).toISOString(), to: monday.toISOString() };
  }
  return {};
}

/** Выбранный чип ленты → параметры events_list / events_map. Вид спорта ищется в справочнике по названию. */
export function useFeedFilters() {
  // ?chip=for-you — пришли с главной по ссылке «Все рекомендации»
  const [searchParams] = useSearchParams();
  const [chip, setChip] = useState<FeedChip>(() => (searchParams.get("chip") === "for-you" ? FOR_YOU_CHIP : "Все"));
  const [extra, setExtra] = useState<FeedExtra>({});
  const forYou = chip === FOR_YOU_CHIP;
  const isSport = !forYou && !["Все", "Сегодня", "Выходные"].includes(chip);
  const sport = useSportsSearch({ query: chip }, { query: { enabled: isSport, staleTime: 10 * 60_000 } });
  const found = sport.data?.status === 200 ? sport.data.data.find((s) => s.name.toLowerCase() === chip.toLowerCase()) : undefined;
  // Период считается один раз при выборе чипа: иначе «сейчас» в параметрах менялось бы на каждом рендере
  // и каждый рендер давал бы новый ключ кэша — и новый запрос.
  const range = useMemo(() => period(chip), [chip]);
  const params: EventsListParams = useMemo(() => ({
    ...(isSport ? (found ? { sportId: found.id } : { searchText: chip }) : range),
    ...extra,
    organizationId: searchParams.get("organizationId") || undefined,
  }), [isSport, found, chip, range, extra, searchParams]);
  const extraCount = Object.values(extra).filter((v) => v !== undefined && v !== false).length;
  return { chip, setChip, extra, setExtra, extraCount, params, forYou, ready: !isSport || !sport.isPending };
}
