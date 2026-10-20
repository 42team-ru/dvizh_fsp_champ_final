import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { useUser } from "@/entity/user/model/use-user";
import { useUsersMyPreferences } from "@/shared/api/generated/core/users/users";
import { CITY_RADIUS_KM, findFeedCity } from "@/shared/lib/cities";

function readStored(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

/** URL имеет приоритет над сохранённым выбором; без выбора берём город профиля. */
export function useFeedCity() {
  const { user, isLoading } = useUser();
  const [search, setSearch] = useSearchParams();
  const ownCity = findFeedCity(user?.city);
  const ownName = ownCity?.name ?? user?.city?.trim();
  const preferences = useUsersMyPreferences({ query: { enabled: !!ownName && !ownCity } });
  const home = preferences.data?.status === 200 ? preferences.data.data.home : undefined;
  const ownPoint = ownCity ?? home;
  const key = "feed-city:" + (user?.id ?? "anonymous");
  const requested = search.get("city") ?? readStored(key) ?? ownName ?? "all";
  const chosen = findFeedCity(requested);
  const isOwn = !!ownName && requested.trim().toLocaleLowerCase("ru") === ownName.toLocaleLowerCase("ru");
  const urlLat = search.get("cityLat");
  const urlLon = search.get("cityLon");
  const linkedPoint = urlLat && urlLon && Number.isFinite(+urlLat) && Number.isFinite(+urlLon)
    && Math.abs(+urlLat) <= 90 && Math.abs(+urlLon) <= 180
    ? { lat: +urlLat, lon: +urlLon } : undefined;
  const point = requested === "all" ? undefined : chosen ?? linkedPoint ?? (isOwn ? ownPoint : undefined);
  const value = point ? chosen?.name ?? requested.trim() : "all";
  const ready = !isLoading && !(isOwn && !ownCity && preferences.isLoading);
  const label = value === "all" ? "Все города" : value;

  useEffect(() => {
    if (!ready || search.has("city")) return;
    const next = new URLSearchParams(search);
    next.set("city", value);
    if (!chosen && point) {
      next.set("cityLat", String(point.lat));
      next.set("cityLon", String(point.lon));
    }
    setSearch(next, { replace: true, preventScrollReset: true });
  }, [ready, search, setSearch, value, chosen, point?.lat, point?.lon]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(key, value); } catch { /* Хранилище может быть отключено. */ }
  }, [key, ready, value]);

  const select = (city: string) => {
    const next = new URLSearchParams(search);
    next.set("city", city);
    next.delete("cityLat");
    next.delete("cityLon");
    if (city === ownName && !ownCity && ownPoint) {
      next.set("cityLat", String(ownPoint.lat));
      next.set("cityLon", String(ownPoint.lon));
    }
    setSearch(next, { preventScrollReset: true });
  };

  return {
    value, label, ownName, ownAvailable: !!ownPoint, select, ready,
    params: point ? { lat: point.lat, lon: point.lon, radiusKm: CITY_RADIUS_KM } : {},
    unavailable: !!ownName && !ownPoint && !preferences.isLoading,
  };
}
