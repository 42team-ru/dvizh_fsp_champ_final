import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useRegistrationsMine } from "@/shared/api/generated/core/registrations/registrations";
import { useEventsMine } from "@/shared/api/generated/core/events/events";
import type { EventMapProperties, EventSummaryResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { createEventsMap, hasMapKey, type MapPoint, type MapProvider } from "../lib/map-provider";

/** Подпись второй строки метки: что у меня с этой встречей. */
const NOTE: Record<string, string> = { CONFIRMED: "иду", PENDING: "заявка", WAITLISTED: "в очереди", HOST: "веду" };

function toPoint(e: EventSummaryResponse, mine: string): MapPoint | null {
  if (e.lat == null || e.lon == null || e.status !== "PUBLISHED" || e.cancelledByOrganizer) return null;
  const data: EventMapProperties = {
    id: e.id, title: e.title, sport: e.sport, startAt: e.startAt, endAt: e.endAt, occurrenceId: e.occurrenceId,
    recurring: e.recurring, scheduleDescription: e.scheduleDescription, address: e.address, level: e.level,
    joinMode: e.joinMode, participantsCount: e.participantsCount, capacity: e.capacity,
    // зелёная метка «я иду» — у подтверждённых записей и у своих мероприятий
    myRegistrationStatus: mine === "CONFIRMED" || mine === "HOST" ? "CONFIRMED" : undefined,
  };
  const day = new Date(e.startAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "");
  return { id: e.id, coordinates: [e.lon, e.lat], data, note: `${day} · ${NOTE[mine]}` };
}

/**
 * Карта моих ближайших встреч: принятые записи, заявки, лист ожидания и мероприятия, которые я веду.
 * Онлайн-встречи без координат на карту не попадают, но учитываются в подписи.
 */
export function MyEventsMap({ className }: { className?: string }) {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapProvider | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const regs = useRegistrationsMine({ when: "UPCOMING", size: 100 });
  const hosted = useEventsMine({ status: "PUBLISHED", when: "UPCOMING", size: 100 });

  const { points, online } = useMemo(() => {
    const byId = new Map<string, MapPoint>();
    let online = 0;
    const add = (e: EventSummaryResponse, mine: string) => {
      if (byId.has(e.id)) return;
      const point = toPoint(e, mine);
      if (point) byId.set(e.id, point);
      else if (e.format === "ONLINE" && e.status === "PUBLISHED") online += 1;
    };
    for (const e of hosted.data?.status === 200 ? hosted.data.data.items ?? [] : []) add(e, "HOST");
    for (const r of regs.data?.status === 200 ? regs.data.data.items ?? [] : []) {
      if (r.status in NOTE) add(r.event, r.status);
    }
    return { points: [...byId.values()], online };
  }, [regs.data, hosted.data]);

  // Центр — ближайшая по времени встреча; карта создаётся, когда данные пришли.
  const center = useMemo(
    () => [...points].sort((a, b) => a.data.startAt.localeCompare(b.data.startAt))[0]?.coordinates,
    [points],
  );
  const loaded = !regs.isLoading && !hosted.isLoading;

  useEffect(() => {
    if (!hasMapKey() || !container.current || !loaded) return;
    let cancelled = false;
    createEventsMap(container.current, center, center ? 12 : 11).then((m) => {
      if (cancelled) return m.destroy();
      map.current = m;
      m.onPointClick((point) => navigate(`/events/${point.id}`));
      setReady(true);
    }).catch((error) => {
      console.error("2GIS map failed to load", error);
      setFailed(true);
    });
    return () => {
      cancelled = true;
      map.current?.destroy();
      map.current = null;
      setReady(false);
    };
    // Карта создаётся один раз после загрузки данных; точки обновляются эффектом ниже.
  }, [loaded]);

  useEffect(() => {
    if (ready) map.current?.setPoints(points);
  }, [ready, points]);

  const caption = points.length === 0
    ? online > 0 ? `Только онлайн-встречи: ${online}` : "Запишитесь на встречу — она появится здесь"
    : online > 0 ? `+ онлайн: ${online}` : null;

  if (!hasMapKey() || failed) {
    return (
      <p className={`flex items-center justify-center p-4 text-center text-sm font-semibold text-muted-foreground ${className ?? ""}`}>
        {failed ? "Карта 2ГИС не загрузилась." : "Для карты нужен ключ 2ГИС (VITE_2GIS_KEY)."}
      </p>
    );
  }
  return (
    <div className={`relative ${className ?? ""}`}>
      <div ref={container} className="absolute inset-0" />
      {loaded && caption && (
        <span className="pointer-events-none absolute right-3 bottom-3 left-3 z-[500] rounded-pill border-2 border-ink bg-card px-3 py-1 text-center text-xs font-bold text-foreground">
          {caption}
        </span>
      )}
    </div>
  );
}
