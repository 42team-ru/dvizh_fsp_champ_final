import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "cn";
import type { EventMapProperties, SportResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { createEventsMap, DEFAULT_CENTER, hasMapKey, type MapPoint, type MapProvider } from "@/widgets/events-map/lib/map-provider";

/** Демо-встречи для карты лендинга: гость не вошёл, API карты ему закрыт — показываем моки по Красноярску. */
const MOCKS: [string, string, number, number, number][] = [
  // вид спорта, название, сдвиг по долготе и широте от центра, через сколько часов
  ["Бег", "Пробежка по набережной", 0.004, -0.004, 2],
  ["Бег", "Утренний круг на Татышеве", 0.03, -0.012, 15],
  ["Футбол", "Футбол 6×6 у школы", -0.012, 0.008, 3],
  ["Футбол", "Вечерний футбол", -0.018, 0.012, 26],
  ["Велоспорт", "Велопрогулка до Удачного", 0.021, 0.006, 4],
  ["Йога", "Йога в парке Горького", -0.006, 0.002, 5],
  ["Йога", "Йога на рассвете", -0.004, 0.006, 16],
  ["Шахматы", "Блиц в «Ладье»", 0.009, 0.004, 6],
  ["Баскетбол", "Стритбол во дворе", -0.025, -0.006, 7],
  ["Баскетбол", "Баскетбол по вечерам", -0.03, -0.002, 30],
  ["Зарядка", "Зарядка во дворе", 0.012, 0.016, 14],
  ["Теннис", "Теннис для новичков", 0.038, 0.01, 20],
  ["Скандинавская ходьба", "Ходьба по Столбам", -0.045, -0.02, 22],
  ["Петанк", "Петанк на Острове", 0.026, -0.016, 9],
];

function mockPoints(now: number): MapPoint[] {
  return MOCKS.map(([sport, title, dLon, dLat, hours], i) => {
    const data: EventMapProperties = {
      id: `demo-${i}`,
      title,
      sport: { id: sport, name: sport } as SportResponse,
      startAt: new Date(now + hours * 3_600_000).toISOString(),
      recurring: false,
      level: "ANY",
      joinMode: "FREE",
      participantsCount: 3 + (i % 6),
    };
    return { id: data.id, coordinates: [DEFAULT_CENTER[0] + dLon, DEFAULT_CENTER[1] + dLat], data };
  });
}

const SPORTS = ["Все", "Бег", "Футбол", "Йога"] as const;

/** Фильтры меняют один набор встреч и на карте 2ГИС, и на резервной схеме. */
export function LandingMap() {
  const ref = useRef<HTMLDivElement>(null);
  const [points] = useState(() => mockPoints(Date.now()));
  const [sport, setSport] = useState<string>("Все");
  const [mode, setMode] = useState<"range" | "now">("range");
  const [range, setRange] = useState<[number, number]>([0, 36]);
  const [map, setMap] = useState<MapProvider | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const enabled = hasMapKey();
  const [from, to] = mode === "now" ? [0, 3] : range;
  const visible = points.filter((point, index) =>
    (sport === "Все" || point.data.sport.name === sport) &&
    MOCKS[index][4] >= from && MOCKS[index][4] <= to,
  );
  const selected = visible.find((point) => point.id === selectedId) ?? null;

  useEffect(() => {
    const container = ref.current;
    if (!container || !enabled) return;
    let cancelled = false;
    let instance: MapProvider | undefined;
    createEventsMap(container, DEFAULT_CENTER, 13).then((created) => {
      if (cancelled) return created.destroy();
      instance = created;
      created.onPointClick((point) => setSelectedId(point.id));
      setMap(created);
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      instance?.destroy();
    };
  }, [enabled]);

  useEffect(() => {
    if (!map) return;
    const filtered = points.filter((point, index) =>
      (sport === "Все" || point.data.sport.name === sport) &&
      MOCKS[index][4] >= from && MOCKS[index][4] <= to,
    );
    map.setPoints(filtered);
    map.focus(filtered.find((point) => point.id === selectedId) ?? null);
  }, [map, points, sport, from, to, selectedId]);

  const reset = () => {
    setSport("Все");
    setMode("range");
    setRange([0, 36]);
    setSelectedId(null);
  };

  return (
    <div className="landing-map-panel pointer-events-auto overflow-hidden rounded-[26px] border-3 border-ink bg-white shadow-[6px_6px_0_var(--ultramarine)]">
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink p-3" role="group" aria-label="Вид спорта на карте">
        {SPORTS.map((name) => (
          <Button key={name} rough={false} size="sm" variant={sport === name ? "default" : "soft"}
            aria-pressed={sport === name} onClick={() => { setSport(name); setSelectedId(null); }}>
            {name}
          </Button>
        ))}
        <span className="ml-auto text-[10px] font-extrabold uppercase text-ink-muted">Пример встреч</span>
      </div>
      <div className="relative h-[240px] bg-map-green lg:h-[280px]" aria-label="Карта встреч">
        {enabled && !failed && <div ref={ref} className="absolute inset-0" />}
        {(!enabled || failed) && (
          <>
            <img src="/landing/s3/map-tiles.svg" alt="" className="absolute inset-0 size-full object-cover" />
            {visible.map((point) => (
              <button key={point.id} type="button" aria-label={point.data.title}
                onClick={() => setSelectedId(point.id)}
                style={{
                  left: `${Math.max(8, Math.min(92, 50 + (point.coordinates[0] - DEFAULT_CENTER[0]) * 850))}%`,
                  top: `${Math.max(12, Math.min(80, 50 - (point.coordinates[1] - DEFAULT_CENTER[1]) * 1500))}%`,
                }}
                className={cn("absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-ink text-xs font-extrabold shadow-hard-sm",
                  selectedId === point.id ? "bg-lime text-ink" : "bg-ultramarine text-white")}>
                {MOCKS.findIndex((_, i) => `demo-${i}` === point.id) + 1}
              </button>
            ))}
          </>
        )}
        {selected && (
          <div className="absolute inset-x-3 bottom-3 z-[500] flex items-center gap-3 rounded-xl border-2 border-ink bg-white px-3 py-2 shadow-hard-sm">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">{selected.data.title}</p>
              <p className="text-xs text-ink-muted">{selected.data.sport.name} · {selected.data.participantsCount} участников</p>
            </div>
            <Button size="icon-sm" rough={false} variant="soft" aria-label="Закрыть встречу" onClick={() => setSelectedId(null)}>×</Button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 border-t-2 border-ink p-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Время встреч">
          <Button size="sm" rough={false} variant={mode === "range" ? "default" : "soft"} aria-pressed={mode === "range"} onClick={() => setMode("range")}>Диапазон</Button>
          <Button size="sm" rough={false} variant={mode === "now" ? "default" : "soft"} aria-pressed={mode === "now"} onClick={() => setMode("now")}>Сейчас</Button>
          <Button size="sm" rough={false} variant="ghost" className="ml-auto" onClick={reset}>Сбросить</Button>
        </div>
        {mode === "range" ? (
          <div className="grid grid-cols-2 gap-5">
            <label className="min-w-0 text-xs font-bold">
              От: {range[0] === 0 ? "сейчас" : `через ${range[0]} ч`}
              <Input type="range" min={0} max={35} step={1} value={range[0]} aria-label="Начало диапазона, часов от текущего момента"
                onChange={(event) => setRange([Math.min(Number(event.target.value), range[1] - 1), range[1]])}
                className="mt-1 h-7 w-full cursor-pointer border-0 bg-transparent p-0 accent-ultramarine shadow-none" />
            </label>
            <label className="min-w-0 text-xs font-bold">
              До: через {range[1]} ч
              <Input type="range" min={1} max={36} step={1} value={range[1]} aria-label="Конец диапазона, часов от текущего момента"
                onChange={(event) => setRange([range[0], Math.max(Number(event.target.value), range[0] + 1)])}
                className="mt-1 h-7 w-full cursor-pointer border-0 bg-transparent p-0 accent-ultramarine shadow-none" />
            </label>
          </div>
        ) : <p className="text-xs font-bold">Встречи, которые начнутся в ближайшие 3 часа</p>}
        <p role="status" className="text-xs font-bold text-ink-muted">
          {visible.length ? `На карте: ${visible.length}` : "В этом диапазоне встреч нет — расширь время или выбери другой спорт."}
        </p>
      </div>
    </div>
  );
}
