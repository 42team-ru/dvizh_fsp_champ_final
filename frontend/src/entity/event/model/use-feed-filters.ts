import { useMemo, useState } from "react";
import { useSportsSearch } from "@/shared/api/generated/core/sports/sports";
import type { EventsListParams } from "@/shared/api/generated/core/appAPI.schemas";

/** Чипы ленты: «Все», два периода и виды спорта (по названию из справочника). */
export const FEED_CHIPS = ["Все", "Сегодня", "Выходные", "Бег", "Футбол", "Йога", "Шахматы"] as const;
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
  const [chip, setChip] = useState<FeedChip>("Все");
  const isSport = !["Все", "Сегодня", "Выходные"].includes(chip);
  const sport = useSportsSearch({ query: chip }, { query: { enabled: isSport, staleTime: 10 * 60_000 } });
  const found = sport.data?.status === 200 ? sport.data.data.find((s) => s.name.toLowerCase() === chip.toLowerCase()) : undefined;
  // Период считается один раз при выборе чипа: иначе «сейчас» в параметрах менялось бы на каждом рендере
  // и каждый рендер давал бы новый ключ кэша — и новый запрос.
  const range = useMemo(() => period(chip), [chip]);
  const params: EventsListParams = useMemo(() => isSport
    ? (found ? { sportId: found.id } : { searchText: chip })
    : range, [isSport, found, chip, range]);
  return { chip, setChip, params, ready: !isSport || !sport.isPending };
}
