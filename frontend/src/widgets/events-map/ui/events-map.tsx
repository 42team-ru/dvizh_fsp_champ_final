import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { keepPreviousData } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useEventsMap } from "@/shared/api/generated/core/events/events";
import { useUsersMyPreferences } from "@/shared/api/generated/core/users/users";
import type { EventMapFeature, EventMapProperties, EventsMapParams } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { REGISTRATION_STATUS } from "@/shared/lib/statuses";
import { formatWhen } from "@/entity/event/lib/event-format";
import { cn } from "cn";
import { toMapParams } from "../lib/bbox";
import { createEventsMap, hasMapKey, inBbox, type Bbox, type MapPoint, type MapProvider } from "../lib/map-provider";
import {
  DAY, LOOKBACK, MINUTE, SOON, dayShort, endOf, histogram, hhmm, isGoing, startOf, startOfDay, startsSoon,
  type Selection, type Span,
} from "../lib/timeline";
import { TimeDock } from "./time-dock";

/** Фильтры ленты, которые понимает карта (format не нужен: на карте только очные; время задаёт док). */
export type MapFilters = Pick<EventsMapParams, "searchText" | "sportId" | "level" | "joinMode" | "organizationId" | "lat" | "lon" | "radiusKm">;

const toPoint = (f: EventMapFeature): MapPoint => ({
  id: f.id, coordinates: [f.geometry.coordinates[0], f.geometry.coordinates[1]], data: f.properties,
});
/** Сколько строк в боковой ленте до «показать все». */
const LIST_LIMIT = 6;

// Контейнер не перерисовывается React-ом, иначе карта пересоздастся.
const MapContainer = memo(({ onReady }: { onReady(el: HTMLDivElement): void }) => (
  <div ref={(el) => { if (el) onReady(el); }} className="size-full" />
), () => true);

/** Текущее время, раз в минуту: метка «Сейчас» следует за часами. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), MINUTE);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/** Строка боковой ленты: время, название, место; у идущего — полоска «сколько прошло». */
function Row({ p, now, at, selected, onPick }: { p: EventMapProperties; now: number; at: number | null; selected: boolean; onPick(): void }) {
  const going = at != null && isGoing(p, at);
  const progress = going ? Math.min(100, ((at - startOf(p)) / (endOf(p) - startOf(p))) * 100) : 0;
  const otherDay = startOfDay(startOf(p)) !== startOfDay(now);
  return (
    <li>
      <button type="button" onClick={onPick}
        className={cn(
          "flex w-full items-start gap-2.5 border-b-[1.5px] border-track px-1 py-2 text-left",
          selected ? "rounded-[12px] bg-secondary" : "hover:bg-muted",
        )}>
        <span className="flex w-[54px] shrink-0 flex-col">
          <span className="text-base leading-5 font-extrabold tabular-nums">{hhmm(startOf(p))}</span>
          {going ? (
            <span className="text-[10px] font-bold text-muted-foreground">до {hhmm(endOf(p))}</span>
          ) : otherDay ? (
            <span className="text-[10px] font-bold text-muted-foreground">{dayShort(startOf(p))}</span>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm leading-[18px] font-extrabold">{p.title}</span>
          <span className="truncate text-[11px] font-medium text-muted-foreground">
            {p.sport.name}{p.address ? ` · ${p.address}` : ""}
          </span>
          {going && (
            <span className="mt-0.5 block h-1.5 overflow-hidden rounded-pill bg-lavender-soft">
              <span className="block h-full rounded-pill bg-primary" style={{ width: `${Math.max(2, progress)}%` }} />
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

/**
 * Карта событий: метки по видимой области (events_map), кластеры, карточка по клику, док времени под картой
 * и лента справа. Док выбирает момент («что идёт в 15:30») или диапазон; подходящие события — цветные метки,
 * остальные из окна дока — серые точки.
 */
export function EventsMap({ filters = {}, className, mapClassName, withHome = false }: {
  filters?: MapFilters;
  className?: string;
  /** Показать дом из предпочтений и открыть карту на нём (лента). */
  withHome?: boolean;
  /** Высота самой карты; док времени — под ней, лента — сбоку на компьютере и снизу на телефоне. */
  mapClassName?: string;
}) {
  const provider = useRef<MapProvider | null>(null);
  const container = useRef<HTMLDivElement | null>(null);
  /** Область запроса: меняется, только когда экран выходит за уже загруженное. */
  const [bbox, setBbox] = useState<Bbox | null>(null);
  /** Что на экране: по нему фильтруется лента. */
  const [visible, setVisible] = useState<Bbox | null>(null);
  const [selected, setSelected] = useState<EventMapProperties | null>(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const now = useNow();
  const [span, setSpan] = useState<Span>(3);
  const [chosen, setChosen] = useState<Selection>({ mode: "moment", at: now, live: true });
  const selection: Selection = chosen.mode === "moment" && chosen.live ? { ...chosen, at: now } : chosen;

  const preferences = useUsersMyPreferences({ query: { enabled: withHome } });
  const homePoint = preferences.data?.status === 200 ? preferences.data.data.home : undefined;
  const home = useMemo<[number, number] | null>(() => homePoint ? [homePoint.lon, homePoint.lat] : null, [homePoint?.lon, homePoint?.lat]);
  /** Ждём предпочтения, чтобы сразу открыть карту на доме, а не перелетать к нему. Ошибка — открываем как обычно. */
  const homeReady = !withHome || !preferences.isLoading;

  useEffect(() => {
    if (!hasMapKey() || !container.current || !homeReady) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    createEventsMap(container.current, filters.lat != null && filters.lon != null ? [filters.lon, filters.lat] : home ?? undefined, filters.lat != null ? 11 : home ? 13 : 12).then((map) => {
      if (cancelled) return map.destroy();
      provider.current = map;
      map.setHome(home);
      map.onPointClick((point) => {
        setSelected(point.data);
        map.focus(point);
      });
      unsubscribe = map.onViewportChange(({ fetch, visible: view }) => {
        const next = toMapParams(fetch);
        // Тот же bbox — тот же объект состояния: без лишнего рендера и запроса.
        setBbox((prev) => prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next);
        setVisible(view);
      });
    }).catch((error) => {
      console.error("2GIS map failed to load", error);
      setFailed(true);
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
      provider.current?.destroy();
      provider.current = null;
    };
    // Карта создаётся один раз, когда стало известно, где дом; смена дома — эффект ниже.
  }, [homeReady]);

  useEffect(() => { provider.current?.setHome(home); }, [home]);

  // Окно дока: с начала сегодняшнего дня (бэк сам не отдаёт прошлое) на 1/3/7 дней — серые метки и гистограмма.
  const windowStart = startOfDay(now);
  const windowEnd = windowStart + span * DAY;
  // Минута не меняет запросы: границы округлены до 15 минут.
  const q15 = (t: number) => Math.floor(t / (15 * MINUTE)) * 15 * MINUTE;
  const options = { query: { enabled: bbox != null, placeholderData: keepPreviousData, staleTime: 30_000 } };
  const overview = useEventsMap({ ...bbox!, ...filters, from: new Date(windowStart).toISOString(), to: new Date(windowEnd).toISOString() }, options);
  // Активные: в момент — начавшиеся до LOOKBACK назад и начинающиеся в ближайший час; в диапазоне — начало внутри него.
  const activeFrom = selection.mode === "moment" ? selection.at - LOOKBACK : selection.from;
  const activeTo = selection.mode === "moment" ? selection.at + SOON : selection.to;
  const active = useEventsMap({ ...bbox!, ...filters, from: new Date(q15(activeFrom)).toISOString(), to: new Date(q15(activeTo) + 15 * MINUTE).toISOString() }, options);

  const overviewData = overview.data?.status === 200 ? overview.data.data : undefined;
  const activeData = active.data?.status === 200 ? active.data.data : undefined;

  const at = selection.mode === "moment" ? selection.at : null;
  const list = (activeData?.features ?? []).map((f) => f.properties).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const goingNow = selection.mode === "moment" ? list.filter((p) => isGoing(p, selection.at)) : [];
  const soon = selection.mode === "moment" ? list.filter((p) => startsSoon(p, selection.at)) : [];
  const inRange = selection.mode === "range" ? list.filter((p) => startOf(p) >= selection.from && startOf(p) < selection.to) : [];
  const highlighted = new Set([...goingNow, ...inRange].map((p) => p.id));
  /** Строка-ключ: метки пересобираются, только когда меняется набор подсвеченных. */
  const highlightKey = [...highlighted].sort().join();

  // Все метки: из окна дока плюс активные (момент может быть вне окна), подходящие — цветные.
  const points = useMemo(() => {
    const byId = new Map<string, MapPoint>();
    for (const f of overviewData?.features ?? []) byId.set(f.id, { ...toPoint(f), muted: true });
    const lit = new Set(highlightKey ? highlightKey.split(",") : []);
    for (const f of activeData?.features ?? []) {
      const on = lit.has(f.id);
      const note = on && at != null ? `до ${hhmm(endOf(f.properties))}` : undefined;
      byId.set(f.id, { ...toPoint(f), muted: !on, note });
    }
    return [...byId.values()];
  }, [overviewData, activeData, highlightKey, at]);

  useEffect(() => {
    provider.current?.setPoints(points);
  }, [points]);

  const bars = useMemo(() => histogram((overviewData?.features ?? []).map((f) => f.properties), windowStart, span * 24),
    [overviewData, windowStart, span]);
  const onScreen = (list: EventMapProperties[]) =>
    visible ? list.filter((p) => points.some((pt) => pt.id === p.id && inBbox(visible, pt.coordinates))) : list;

  const pick = (p: EventMapProperties) => {
    setSelected(p);
    const point = points.find((pt) => pt.id === p.id);
    if (point) provider.current?.focus(point);
  };

  if (!hasMapKey() || failed) {
    return (
      <div className={cn("flex items-center justify-center rounded-[24px] border-2 border-ink bg-card p-6 text-center", mapClassName, className)}>
        <p className="max-w-md text-base font-semibold text-muted-foreground">
          {failed ? "Не удалось загрузить карту 2ГИС. Проверьте интернет и ключ VITE_2GIS_KEY." : "Для карты нужен ключ 2ГИС: VITE_2GIS_KEY в frontend/.env."}
        </p>
      </div>
    );
  }

  const groups = selection.mode === "moment"
    ? [
        { title: selection.live ? "Идут сейчас" : `Идут в ${hhmm(selection.at)}`, items: onScreen(goingNow) },
        { title: "Начнутся в ближайший час", items: onScreen(soon) },
      ]
    : [{ title: `С ${hhmm(selection.from)} ${dayShort(selection.from)} по ${hhmm(selection.to)} ${dayShort(selection.to)}`, items: onScreen(inRange) }];
  const shownCount = groups.reduce((s, g) => s + g.items.length, 0);
  let budget = expanded ? Infinity : LIST_LIMIT;
  const limited = groups.map((g) => {
    const items = g.items.slice(0, Math.max(0, budget));
    budget -= items.length;
    return { ...g, items };
  });
  const hidden = shownCount - limited.reduce((s, g) => s + g.items.length, 0);

  const activeCount = highlighted.size;
  const totalCount = new Set(points.map((p) => p.id)).size;
  const status = selected?.myRegistrationStatus ? REGISTRATION_STATUS[selected.myRegistrationStatus] : undefined;
  const loading = overview.isFetching || active.isFetching;

  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-stretch", className)}>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] border-2 border-ink bg-card">
        <div className={cn("relative min-h-[320px] flex-1", mapClassName)}>
          <MapContainer onReady={(el) => { container.current = el; }} />
          <div className="pointer-events-none absolute top-3.5 right-3.5 z-[400] flex items-center gap-2 rounded-pill border-[1.5px] border-ink bg-card px-3 py-1.5 text-[11px] whitespace-nowrap">
            <span className="size-2.5 rounded-full border-[1.5px] border-ink bg-primary" />
            <span className="font-extrabold">
              {activeCount} {selection.mode === "moment" ? (selection.live ? "идут сейчас" : `идут в ${hhmm(selection.at)}`) : "в диапазоне"}
            </span>
            <span className="size-2.5 rounded-full border-[1.5px] border-muted-foreground/60 bg-card" />
            <span className="font-bold text-muted-foreground">{Math.max(0, totalCount - activeCount)} вне</span>
          </div>
          {(overviewData?.truncated || activeData?.truncated) && (
            <p className="absolute top-3 left-1/2 z-[400] -translate-x-1/2 rounded-pill border-2 border-ink bg-secondary px-4 py-1.5 text-sm font-bold">
              Показаны не все события — приблизьте карту
            </p>
          )}
          {(overview.error || active.error) && (
            <p role="alert" className="absolute bottom-3 left-3 z-[400] rounded-xl border-2 border-ink bg-card px-3 py-2 text-sm font-bold text-destructive">
              {overview.error?.detail ?? active.error?.detail ?? "Не удалось загрузить события"}
            </p>
          )}
          {selected && (
            <div className="absolute right-3 bottom-3 left-3 z-[400] max-w-sm rounded-[22px] border-2 border-ink bg-card p-4 shadow-hard-sm">
              <button type="button" aria-label="Закрыть" onClick={() => { setSelected(null); provider.current?.focus(null); }}
                className="absolute top-2 right-3 text-lg font-bold">×</button>
              <p className="text-xs font-extrabold tracking-[1px] text-muted-foreground uppercase">
                {selected.sport.name} · {formatWhen(selected.startAt)}{selected.endAt ? `–${hhmm(endOf(selected))}` : ""}
              </p>
              <h3 className="mt-1 pr-6 font-display text-lg leading-6 font-bold">{selected.title}</h3>
              {selected.address && <p className="mt-1 text-sm font-medium text-muted-foreground">{selected.address}</p>}
              <p className="mt-2 text-sm font-bold">
                Записались {selected.participantsCount}{selected.capacity != null ? ` из ${selected.capacity}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {status && <span className={`rounded-pill border-2 border-ink px-3 py-1 text-xs font-extrabold ${status.tone}`}>{status.label}</span>}
                <Button asChild size="sm" className="ml-auto"><Link to={`/events/${selected.id}`}>Подробнее</Link></Button>
              </div>
            </div>
          )}
        </div>
        <TimeDock
          now={now}
          span={span}
          onSpan={(s) => {
            setSpan(s);
            // Момент или диапазон за пределами нового окна — вернуть к «Сейчас».
            const end = startOfDay(now) + s * DAY;
            const out = selection.mode === "moment" ? selection.at >= end : selection.from >= end;
            if (out) setChosen({ mode: "moment", at: now, live: true });
          }}
          selection={selection}
          onSelect={(next, nextSpan) => {
            setChosen(next);
            setExpanded(false);
            if (nextSpan) setSpan(nextSpan);
          }}
          bars={bars}
          activeCount={activeCount}
          totalCount={totalCount}
        />
      </div>

      <aside aria-label="Лента времени" aria-busy={loading}
        className="flex min-h-0 flex-col lg:max-h-none gap-2 rounded-[24px] border-2 border-ink bg-card px-4 pt-4 pb-3 lg:w-[290px] lg:shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-extrabold">Лента времени</h2>
          <span className="rounded-pill border-[1.5px] border-ink bg-secondary px-2.5 py-0.5 text-xs font-extrabold">{shownCount}</span>
        </div>
        <p className="text-[11px] leading-[15px] font-medium text-muted-foreground">
          {selection.mode === "moment"
            ? selection.live ? "Что идёт прямо сейчас · метка следует за часами" : `Что идёт ${dayShort(selection.at)} в ${hhmm(selection.at)}`
            : "Что начнётся в выбранном диапазоне"}
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {bbox && shownCount === 0 && !loading && (
            <p className="pt-3 text-sm font-semibold text-muted-foreground">
              В этой области в это время ничего нет — сдвиньте метку или карту.
            </p>
          )}
          {limited.map((g) => g.items.length > 0 && (
            <section key={g.title}>
              <h3 className="pt-3 pb-1 text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase">{g.title}</h3>
              <ol>
                {g.items.map((p) => (
                  <Row key={p.id} p={p} now={now} at={at} selected={selected?.id === p.id} onPick={() => pick(p)} />
                ))}
              </ol>
            </section>
          ))}
        </div>
        {hidden > 0 && (
          <button type="button" onClick={() => setExpanded(true)}
            className="flex items-center justify-center gap-1.5 rounded-[12px] bg-lavender-soft px-3 py-2 text-xs font-extrabold text-primary">
            ещё {hidden} · показать все
            <ChevronDown className="size-3.5" strokeWidth={2.6} />
          </button>
        )}
      </aside>
    </div>
  );
}
