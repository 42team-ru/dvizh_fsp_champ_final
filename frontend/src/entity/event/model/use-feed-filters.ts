import { useFeedCity } from "./use-feed-city";
import { useMemo } from "react";
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

/** Чип в адресе страницы: короткие латинские коды у служебных чипов, у видов спорта — название. */
const CHIP_SLUG: Partial<Record<FeedChip, string>> = { [FOR_YOU_CHIP]: "for-you", "Все": "all", "Сегодня": "today", "Выходные": "weekend" };
const chipFromUrl = (value: string | null): FeedChip =>
  (FEED_CHIPS.find((c) => (CHIP_SLUG[c] ?? c) === value) ?? "Все");

const EXTRA_KEYS = ["level", "joinMode", "format"] as const;

/** Фильтры «Ещё» из адреса: неизвестные значения отбрасываем, чтобы старая ссылка не ломала ленту. */
function extraFromUrl(search: URLSearchParams): FeedExtra {
  const allowed: Record<(typeof EXTRA_KEYS)[number], string[]> = {
    level: ["ANY", "BEGINNER", "AMATEUR", "PRO"],
    joinMode: ["FREE", "REQUEST"],
    format: ["OFFLINE", "ONLINE"],
  };
  const extra: Record<string, unknown> = {};
  for (const key of EXTRA_KEYS) {
    const value = search.get(key);
    if (value && allowed[key].includes(value)) extra[key] = value;
  }
  if (search.get("forMe") === "true") extra.forMe = true;
  return extra as FeedExtra;
}

/**
 * Выбранный чип ленты → параметры events_list / events_map. Вид спорта ищется в справочнике по названию.
 * Чип и фильтры «Ещё» живут в адресе страницы (?chip=…&level=…), как и город: вернулся «назад» с карточки
 * встречи — лента та же, ссылку с фильтрами можно отправить.
 */
export function useFeedFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const chip = chipFromUrl(searchParams.get("chip"));
  const extraKey = [...EXTRA_KEYS, "forMe"].map((k) => searchParams.get(k) ?? "").join("|");
  const extra = useMemo(() => extraFromUrl(searchParams), [extraKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = (change: (next: URLSearchParams) => void) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      change(next);
      return next;
    }, { replace: true, preventScrollReset: true });
  };
  const setChip = (value: FeedChip) => update((next) => {
    if (value === "Все") next.delete("chip");
    else next.set("chip", CHIP_SLUG[value] ?? value);
  });
  const setExtra = (value: FeedExtra) => update((next) => {
    for (const key of EXTRA_KEYS) {
      if (value[key]) next.set(key, String(value[key]));
      else next.delete(key);
    }
    if (value.forMe) next.set("forMe", "true");
    else next.delete("forMe");
  });
  const forYou = chip === FOR_YOU_CHIP;
  const city = useFeedCity();
  const isSport = !forYou && !["Все", "Сегодня", "Выходные"].includes(chip);
  const sport = useSportsSearch({ query: chip }, { query: { enabled: isSport, staleTime: 10 * 60_000 } });
  const found = sport.data?.status === 200 ? sport.data.data.find((s) => s.name.toLowerCase() === chip.toLowerCase()) : undefined;
  // Период считается один раз при выборе чипа: иначе «сейчас» в параметрах менялось бы на каждом рендере
  // и каждый рендер давал бы новый ключ кэша — и новый запрос.
  const range = useMemo(() => period(chip), [chip]);
  const organizationId = searchParams.get("organizationId") || undefined;
  const params: EventsListParams = useMemo(() => ({
    ...(isSport ? (found ? { sportId: found.id } : { searchText: chip }) : range),
    ...extra,
    ...(!forYou ? city.params : {}),
    organizationId,
  }), [isSport, found, chip, range, extra, organizationId, forYou, city.params.lat, city.params.lon]);
  const extraCount = Object.values(extra).filter((v) => v !== undefined && v !== false).length;
  return { city, chip, setChip, extra, setExtra, extraCount, params, forYou, ready: (forYou || city.ready) && (!isSport || !sport.isPending) };
}
