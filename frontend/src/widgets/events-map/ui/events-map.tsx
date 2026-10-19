import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { keepPreviousData } from "@tanstack/react-query";
import { useEventsMap } from "@/shared/api/generated/core/events/events";
import type { EventMapFeature, EventMapProperties, EventsMapParams } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { REGISTRATION_STATUS } from "@/shared/lib/statuses";
import { formatWhen } from "@/entity/event/lib/event-format";
import { cn } from "cn";
import { toMapParams } from "../lib/bbox";
import { createEventsMap, hasMapKey, type Bbox, type MapPoint, type MapProvider } from "../lib/map-provider";

/** Фильтры ленты, которые понимает карта (format не нужен: на карте только очные). */
export type MapFilters = Pick<EventsMapParams, "searchText" | "sportId" | "level" | "joinMode" | "from" | "to">;

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const DAYS_AHEAD = 14;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayLabel = (d: Date, i: number) => (i === 0 ? "Сегодня" : i === 1 ? "Завтра" : `${WEEKDAYS[d.getDay()]} ${d.getDate()}`);
const time = (iso: string) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const toPoint = (f: EventMapFeature): MapPoint => ({
  id: f.id, coordinates: [f.geometry.coordinates[0], f.geometry.coordinates[1]], data: f.properties,
});

// Контейнер не перерисовывается React-ом, иначе карта пересоздастся.
const MapContainer = memo(({ onReady }: { onReady(el: HTMLDivElement): void }) => (
  <div ref={(el) => { if (el) onReady(el); }} className="size-full" />
), () => true);

/**
 * Карта событий: метки по видимой области (events_map), кластеры, карточка по клику
 * и лента времени — дни и события области по порядку. Выбор дня сужает и карту, и ленту.
 */
export function EventsMap({ filters = {}, className, mapClassName }: {
  filters?: MapFilters;
  className?: string;
  /** Размер самой карты; лента времени — сбоку на компьютере и снизу на телефоне. */
  mapClassName?: string;
}) {
  const provider = useRef<MapProvider | null>(null);
  const container = useRef<HTMLDivElement | null>(null);
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [selected, setSelected] = useState<EventMapProperties | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)), [today]);

  useEffect(() => {
    if (!hasMapKey() || !container.current) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    createEventsMap(container.current).then((map) => {
      if (cancelled) return map.destroy();
      provider.current = map;
      map.onPointClick((point) => {
        setSelected(point.data);
        map.focus(point);
      });
      unsubscribe = map.onViewportChange((next) => setBbox(toMapParams(next)));
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
  }, []);

  // Выбранный день перекрывает период из фильтров ленты; «Сегодня» начинается с текущего момента (так считает бэк).
  const period = day == null ? {} : { from: days[day].toISOString(), to: addDays(days[day], 1).toISOString() };
  const query = useEventsMap({ ...bbox!, ...filters, ...period }, {
    query: { enabled: bbox != null, placeholderData: keepPreviousData, staleTime: 30_000 },
  });
  const data = query.data?.status === 200 ? query.data.data : undefined;
  const points = useMemo(() => (data?.features ?? []).map(toPoint)
    .sort((a, b) => a.data.startAt.localeCompare(b.data.startAt)), [data]);

  useEffect(() => {
    provider.current?.setPoints(points);
  }, [points]);

  const pick = (point: MapPoint) => {
    setSelected(point.data);
    provider.current?.focus(point);
  };

  if (!hasMapKey() || failed) {
    return (
      <div className={cn("flex items-center justify-center rounded-[28px] border-2 border-ink bg-card p-6 text-center", mapClassName, className)}>
        <p className="max-w-md text-base font-semibold text-muted-foreground">
          {failed ? "Не удалось загрузить карту 2ГИС. Проверьте интернет и ключ VITE_2GIS_KEY." : "Для карты нужен ключ 2ГИС: VITE_2GIS_KEY в frontend/.env."}
        </p>
      </div>
    );
  }

  // Лента времени: события области по дням, внутри дня — по времени.
  const groups: { label: string; items: MapPoint[] }[] = [];
  for (const point of points) {
    const date = new Date(point.data.startAt);
    const index = Math.round((startOfDay(date).getTime() - today.getTime()) / 86_400_000);
    const label = index >= 0 && index < DAYS_AHEAD ? dayLabel(date, index) : formatWhen(point.data.startAt).replace(/ \d\d:\d\d$/, "");
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(point);
    else groups.push({ label, items: [point] });
  }

  const status = selected?.myRegistrationStatus ? REGISTRATION_STATUS[selected.myRegistrationStatus] : undefined;
  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row", className)}>
      <div className={cn("relative min-w-0 flex-1 overflow-hidden rounded-[28px] border-2 border-ink", mapClassName)}>
        <MapContainer onReady={(el) => { container.current = el; }} />
        {data?.truncated && (
          <p className="absolute top-3 left-1/2 -translate-x-1/2 rounded-pill border-2 border-ink bg-secondary px-4 py-1.5 text-sm font-bold">
            Показаны ближайшие {data.limit} событий — приблизьте карту
          </p>
        )}
        {query.error && (
          <p role="alert" className="absolute top-3 left-3 rounded-xl border-2 border-ink bg-card px-3 py-2 text-sm font-bold text-destructive">
            {query.error.detail ?? "Не удалось загрузить события"}
          </p>
        )}
        {selected && (
          <div className="absolute right-3 bottom-3 left-3 z-10 max-w-sm rounded-[22px] border-2 border-ink bg-card p-4 shadow-hard-sm">
            <button type="button" aria-label="Закрыть" onClick={() => { setSelected(null); provider.current?.focus(null); }}
              className="absolute top-2 right-3 text-lg font-bold">×</button>
            <p className="text-xs font-extrabold tracking-[1px] text-muted-foreground uppercase">
              {selected.sport.name} · {formatWhen(selected.startAt)}
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

      <aside aria-label="Лента времени" className="flex max-h-[680px] min-h-0 flex-col gap-3 rounded-[28px] border-2 border-ink bg-card p-4 lg:w-[340px]">
        <h2 className="font-display text-lg font-bold">Лента времени</h2>
        <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto pb-1" role="tablist" aria-label="День">
          <Button type="button" size="chip" role="tab" aria-selected={day == null} variant={day == null ? "ink" : "soft"}
            className="shrink-0" onClick={() => setDay(null)}>Все</Button>
          {days.map((d, i) => (
            <Button key={d.toISOString()} type="button" size="chip" role="tab" aria-selected={day === i}
              variant={day === i ? "ink" : "soft"} className="shrink-0" onClick={() => setDay(i)}>
              {dayLabel(d, i)}
            </Button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {bbox && points.length === 0 && !query.isFetching && (
            <p className="text-sm font-semibold text-muted-foreground">В этой области событий нет — сдвиньте карту или выберите другой день.</p>
          )}
          {groups.map((group) => (
            <section key={group.label} className="mb-3">
              <h3 className="mb-1.5 text-xs font-extrabold tracking-[1px] text-muted-foreground uppercase">{group.label}</h3>
              <ol className="flex flex-col gap-1.5">
                {group.items.map((point) => (
                  <li key={point.id}>
                    <button type="button" onClick={() => pick(point)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl border-2 px-3 py-2 text-left",
                        selected?.id === point.id ? "border-ink bg-secondary" : "border-transparent hover:border-ink",
                      )}>
                      <span className="w-12 shrink-0 font-display text-base font-bold">{time(point.data.startAt)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-extrabold">{point.data.title}</span>
                        <span className="block truncate text-xs font-semibold text-muted-foreground">
                          {point.data.sport.name}{point.data.address ? ` · ${point.data.address}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}
