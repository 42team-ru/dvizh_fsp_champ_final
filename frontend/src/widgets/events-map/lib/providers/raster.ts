import { DEFAULT_CENTER, KEY, type Bbox, type MapPoint, type MapProvider, type PointPicker } from "../map-contract";
import { clusterHtml, contains, inBbox, mount, pad, pinHtml } from "../map-utils";

/** RasterJS: координаты SDK [lat, lng], наружу всегда [lon, lat]. */
/* Минимальные типы того, что используем из глобального DG (RasterJS). */
type LatLng = { lat: number; lng: number };
type Point = { x: number; y: number };
interface DgLayer { addTo(map: DgMap): DgLayer; remove(): void; on(event: string, cb: (e: { originalEvent?: Event }) => void): DgLayer }
interface DgMap {
  getBounds(): { getSouthWest(): LatLng; getNorthEast(): LatLng };
  getZoom(): number;
  setView(center: [number, number], zoom: number, options?: object): DgMap;
  latLngToContainerPoint(latlng: [number, number]): Point;
  containerPointToLatLng(point: [number, number]): LatLng;
  on(event: string, cb: (e: { latlng: LatLng }) => void): DgMap;
  off(event: string, cb: (e: { latlng: LatLng }) => void): DgMap;
  remove(): void;
}
interface DgApi {
  then(cb: () => void, reject?: (e: unknown) => void): Promise<void>;
  map(el: HTMLElement, options: object): DgMap;
  marker(latlng: [number, number], options: object): DgLayer;
  divIcon(options: { html: string; className: string; iconSize: [number, number] | null; iconAnchor?: [number, number] }): object;
}
/** Глобальный объект, который создаёт загрузчик RasterJS. */
const globalDg = () => (window as unknown as { DG?: DgApi }).DG;

// В обёртке: у DG есть метод then, и Promise «проглотил» бы его как thenable вместо самого объекта.
let loading: Promise<{ dg: DgApi }> | null = null;

/** Загрузчик RasterJS: скрипт с ключом, затем DG.then. Один раз на страницу. */
function loadDg(): Promise<{ dg: DgApi }> {
  if (!loading) {
    loading = new Promise<{ dg: DgApi }>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.api.2gis.ru/2.0/loader.js?pkg=full&skin=light&key=${encodeURIComponent(KEY ?? "")}`;
      script.async = true;
      script.onload = () => {
        const dg = globalDg();
        // До загрузки в window.DG лежит заглушка загрузчика; настоящий DG (с map, marker) — уже после then.
        if (dg) dg.then(() => {
          const ready = globalDg();
          if (ready?.map) resolve({ dg: ready });
          else reject(new Error("2GIS RasterJS: DG.map не найден"));
        }, reject);
        else reject(new Error("DG not found"));
      };
      script.onerror = () => reject(new Error("2GIS loader failed"));
      document.head.appendChild(script);
    }).catch((error) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

/** Минимализм: без значков POI, геокликера, полноэкранной кнопки и выбора проекта; зум — кнопками и колесом. */
const mapOptions = (center: [number, number], zoom: number) => ({
  center: [center[1], center[0]],
  zoom,
  key: KEY,
  poi: false,
  geoclicker: false,
  fullscreenControl: false,
  projectDetector: false,
  zoomControl: true,
});

function readBbox(map: DgMap): Bbox {
  const b = map.getBounds();
  const sw = b.getSouthWest();
  const ne = b.getNorthEast();
  return { minLon: sw.lng, minLat: sw.lat, maxLon: ne.lng, maxLat: ne.lat };
}

/** Простая кластеризация по экрану: точки ближе RADIUS пикселей собираются в кружок с числом. */
const RADIUS = 56;
function clusterize(map: DgMap, points: MapPoint[]) {
  const groups: { at: Point; points: MapPoint[] }[] = [];
  for (const point of points) {
    const at = map.latLngToContainerPoint([point.coordinates[1], point.coordinates[0]]);
    const near = groups.find((g) => Math.hypot(g.at.x - at.x, g.at.y - at.y) < RADIUS);
    if (near) near.points.push(point);
    else groups.push({ at, points: [point] });
  }
  return groups;
}

/** Карта событий: метки с видом спорта и временем, кластеры с числом событий. */
export async function createEventsMap(container: HTMLElement, center = DEFAULT_CENTER, zoom = 12): Promise<MapProvider> {
  const { dg } = await loadDg();
  const el = mount(container);
  const map = dg.map(el, mapOptions(center, zoom));
  let points: MapPoint[] = [];
  let activeId: string | null = null;
  let layers: DgLayer[] = [];
  let clickHandler: ((point: MapPoint) => void) | undefined;
  let home: DgLayer | undefined;

  // Рисуем только то, что на экране (с небольшим запасом), и один раз после остановки карты.
  const render = () => {
    layers.forEach((layer) => layer.remove());
    const view = pad(readBbox(map));
    const shown = points.filter((p) => inBbox(view, p.coordinates));
    // Активные и серые кластеризуются отдельно: серые не «съедают» активные метки.
    const groups = [
      ...clusterize(map, shown.filter((p) => p.muted && p.id !== activeId)),
      ...clusterize(map, shown.filter((p) => !p.muted || p.id === activeId)),
    ];
    layers = groups.map((group) => {
      if (group.points.length === 1) {
        const point = group.points[0];
        return dg.marker([point.coordinates[1], point.coordinates[0]], { icon: dg.divIcon({ className: "map-pin-host", iconSize: null, html: pinHtml(point, point.id === activeId) }), riseOnHover: true, zIndexOffset: point.muted ? -1000 : 0 })
          .addTo(map).on("click", () => clickHandler?.(point));
      }
      // Кластер — в среднем положении его точек; клик приближает к нему.
      const lat = group.points.reduce((s, p) => s + p.coordinates[1], 0) / group.points.length;
      const lon = group.points.reduce((s, p) => s + p.coordinates[0], 0) / group.points.length;
      const muted = group.points.every((p) => p.muted);
      return dg.marker([lat, lon], { icon: dg.divIcon({ className: "map-pin-host", iconSize: null, html: clusterHtml(group.points.length, muted) }), zIndexOffset: muted ? -1000 : 0 })
        .addTo(map).on("click", () => map.setView([lat, lon], map.getZoom() + 2));
    });
  };
  let renderTimer: number | undefined;
  const scheduleRender = () => {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(render, 120);
  };
  map.on("moveend", scheduleRender);

  return {
    onViewportChange(cb) {
      let timer: number | undefined;
      let fetched: Bbox | null = null;
      const emit = () => {
        const visible = readBbox(map);
        if (!fetched || !contains(fetched, visible)) fetched = pad(visible);
        cb({ fetch: fetched, visible });
      };
      const handler = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(emit, 500);
      };
      map.on("moveend", handler);
      emit();
      return () => {
        window.clearTimeout(timer);
        map.off("moveend", handler);
      };
    },
    setPoints(next) {
      points = next;
      render();
    },
    onPointClick(cb) {
      clickHandler = cb;
    },
    focus(point) {
      activeId = point?.id ?? null;
      if (point) map.setView([point.coordinates[1], point.coordinates[0]], Math.max(map.getZoom(), 15));
      render();
    },
    setHome(point) {
      home?.remove();
      home = point
        ? dg.marker([point[1], point[0]], {
            // Капля 40×50 из public/feed, кончик — в точке (18, 46).
            icon: dg.divIcon({ className: "map-pin-host", iconSize: [40, 50], iconAnchor: [18, 46],
              html: '<img class="map-home" src="/feed/map-home-pin.svg" width="40" height="50" alt="Мой дом" title="Мой дом">' }),
            interactive: false,
            zIndexOffset: 2000,
          }).addTo(map)
        : undefined;
    },
    destroy() {
      window.clearTimeout(renderTimer);
      layers.forEach((layer) => layer.remove());
      home?.remove();
      map.remove();
      el.remove();
    },
  };
}

/** Карта, которую нельзя двигать: только показать точку (страница события). */
const LOCKED = {
  dragging: false,
  touchZoom: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  boxZoom: false,
  keyboard: false,
  zoomControl: false,
};

/** Мини-карта места: клик ставит маркер и вызывает onPick([lon, lat]); без onPick — залоченный показ точки. */
export async function createPointPicker(container: HTMLElement, initial: [number, number] | null,
  onPick?: (point: [number, number]) => void): Promise<PointPicker> {
  const { dg } = await loadDg();
  const el = mount(container);
  const map = dg.map(el, { ...mapOptions(initial ?? DEFAULT_CENTER, initial ? 15 : 12), ...(onPick ? {} : LOCKED) });
  const icon = dg.divIcon({ className: "map-pin-host", iconSize: null, html: '<span class="map-dot"></span>' });
  let marker: DgLayer | undefined;
  const setPoint = (point: [number, number] | null) => {
    marker?.remove();
    marker = point ? dg.marker([point[1], point[0]], { icon }).addTo(map) : undefined;
  };
  setPoint(initial);
  if (onPick) map.on("click", (event) => {
    const point: [number, number] = [event.latlng.lng, event.latlng.lat];
    setPoint(point);
    onPick(point);
  });
  return {
    setPoint,
    show(point, zoom = 16) {
      setPoint(point);
      map.setView([point[1], point[0]], zoom);
    },
    destroy() {
      marker?.remove();
      map.remove();
      el.remove();
    },
  };
}
