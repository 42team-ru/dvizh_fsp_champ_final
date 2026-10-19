import type { EventMapProperties } from "@/shared/api/generated/core/appAPI.schemas";
import "./map-pins.css";

/*
 * Всё, что знает про карту 2ГИС — RasterJS API (https://docs.2gis.com/maps/others/rasterjs): плоские растровые тайлы,
 * без 3D, наклона и поворота. API в духе Leaflet, координаты [lat, lng] — переводим на границе этого файла.
 * Компоненты работают только с MapProvider и PointPicker и видят координаты как в GeoJSON: [lon, lat].
 */

export type Bbox = { minLon: number; minLat: number; maxLon: number; maxLat: number };
export type MapPoint = { id: string; coordinates: [number, number]; data: EventMapProperties };

/** fetch — область для запроса (видимая с запасом), visible — что на экране сейчас. */
export type Viewport = { fetch: Bbox; visible: Bbox };

export interface MapProvider {
  /** Не чаще раза в 500 мс после остановки карты; fetch меняется, только когда экран выходит за уже загруженное. */
  onViewportChange(cb: (viewport: Viewport) => void): () => void;
  setPoints(points: MapPoint[]): void;
  onPointClick(cb: (point: MapPoint) => void): void;
  /** Показать точку: сдвинуть карту и подсветить метку (выбор в ленте времени). */
  focus(point: MapPoint | null): void;
  destroy(): void;
}

/** Красноярск: [lon, lat]. */
export const DEFAULT_CENTER: [number, number] = [92.8526, 56.0106];
const KEY = import.meta.env.VITE_2GIS_KEY as string | undefined;

export const hasMapKey = () => Boolean(KEY);

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

/**
 * Свой вложенный элемент на каждую карту: React в StrictMode монтирует эффект дважды, и две асинхронные
 * инициализации иначе попадали бы в один контейнер ("Map container is already initialized").
 */
function mount(container: HTMLElement) {
  const el = document.createElement("div");
  el.style.width = "100%";
  el.style.height = "100%";
  container.appendChild(el);
  return el;
}

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Метка события: вид спорта и время начала; «я записан» и выбранная — свои цвета. */
function pinIcon(dg: DgApi, point: MapPoint, active: boolean) {
  const time = new Date(point.data.startAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const mine = point.data.myRegistrationStatus === "CONFIRMED";
  return dg.divIcon({
    className: "map-pin-host",
    iconSize: null,
    html: `<span class="map-pin${mine ? " map-pin--mine" : ""}${active ? " map-pin--active" : ""}" title="${escape(point.data.title)}">`
      + `<span class="map-pin__sport">${escape(point.data.sport.name)}</span><span class="map-pin__time">${time}</span></span>`,
  });
}

const clusterIcon = (dg: DgApi, count: number) =>
  dg.divIcon({ className: "map-pin-host", iconSize: null, html: `<span class="map-cluster">${count}</span>` });

/** Запас вокруг экрана: сдвиги и приближение внутри него не ходят на бэк. */
const PAD = 0.5;
const pad = (b: Bbox): Bbox => {
  const dx = (b.maxLon - b.minLon) * PAD;
  const dy = (b.maxLat - b.minLat) * PAD;
  return { minLon: b.minLon - dx, minLat: b.minLat - dy, maxLon: b.maxLon + dx, maxLat: b.maxLat + dy };
};
const contains = (outer: Bbox, inner: Bbox) =>
  inner.minLon >= outer.minLon && inner.maxLon <= outer.maxLon && inner.minLat >= outer.minLat && inner.maxLat <= outer.maxLat;
export const inBbox = (b: Bbox, [lon, lat]: [number, number]) =>
  lon >= b.minLon && lon <= b.maxLon && lat >= b.minLat && lat <= b.maxLat;

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

  // Рисуем только то, что на экране (с небольшим запасом), и один раз после остановки карты.
  const render = () => {
    layers.forEach((layer) => layer.remove());
    const view = pad(readBbox(map));
    layers = clusterize(map, points.filter((p) => inBbox(view, p.coordinates))).map((group) => {
      if (group.points.length === 1) {
        const point = group.points[0];
        return dg.marker([point.coordinates[1], point.coordinates[0]], { icon: pinIcon(dg, point, point.id === activeId), riseOnHover: true })
          .addTo(map).on("click", () => clickHandler?.(point));
      }
      // Кластер — в среднем положении его точек; клик приближает к нему.
      const lat = group.points.reduce((s, p) => s + p.coordinates[1], 0) / group.points.length;
      const lon = group.points.reduce((s, p) => s + p.coordinates[0], 0) / group.points.length;
      return dg.marker([lat, lon], { icon: clusterIcon(dg, group.points.length) })
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
    destroy() {
      window.clearTimeout(renderTimer);
      layers.forEach((layer) => layer.remove());
      map.remove();
      el.remove();
    },
  };
}

export interface PointPicker {
  /** Поставить маркер программно (например, при открытии формы с уже выбранной точкой). */
  setPoint(point: [number, number] | null): void;
  destroy(): void;
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
    destroy() {
      marker?.remove();
      map.remove();
      el.remove();
    },
  };
}
