import type { Bbox, MapPoint } from "./map-contract";

/**
 * Свой вложенный элемент на каждую карту: React в StrictMode монтирует эффект дважды, и две асинхронные
 * инициализации иначе попадали бы в один контейнер ("Map container is already initialized").
 */
export function mount(container: HTMLElement) {
  const el = document.createElement("div");
  el.style.width = "100%";
  el.style.height = "100%";
  container.appendChild(el);
  return el;
}

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Запас вокруг экрана: сдвиги и приближение внутри него не ходят на бэк. */
const PAD = 0.5;
export const pad = (b: Bbox): Bbox => {
  const dx = (b.maxLon - b.minLon) * PAD;
  const dy = (b.maxLat - b.minLat) * PAD;
  return { minLon: b.minLon - dx, minLat: b.minLat - dy, maxLon: b.maxLon + dx, maxLat: b.maxLat + dy };
};
export const contains = (outer: Bbox, inner: Bbox) =>
  inner.minLon >= outer.minLon && inner.maxLon <= outer.maxLon && inner.minLat >= outer.minLat && inner.maxLat <= outer.maxLat;
export const inBbox = (b: Bbox, [lon, lat]: [number, number]) =>
  lon >= b.minLon && lon <= b.maxLon && lat >= b.minLat && lat <= b.maxLat;

/** Метка события: вид спорта и время начала; «я записан» и выбранная — свои цвета. */
export function pinHtml(point: MapPoint, active: boolean) {
  if (point.muted && !active) {
    return `<span class="map-dot-muted" title="${escape(point.data.title)}"></span>`;
  }
  const time = point.note ?? new Date(point.data.startAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const mine = point.data.myRegistrationStatus === "CONFIRMED";
  return `<span class="map-pin${mine ? " map-pin--mine" : ""}${active ? " map-pin--active" : ""}" title="${escape(point.data.title)}">`
      + `<span class="map-pin__sport">${escape(point.data.sport.name)}</span><span class="map-pin__time">${time}</span></span>`;
}

export const clusterHtml = (count: number, muted: boolean) =>
  `<span class="map-cluster${muted ? " map-cluster--muted" : ""}">${count}</span>`;
