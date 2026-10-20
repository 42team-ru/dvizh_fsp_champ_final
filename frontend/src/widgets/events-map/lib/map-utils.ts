import type { Bbox, MapPoint } from "./map-contract";
import { toast } from "@/shared/lib/toast";
import { PRECISE_ACCURACY_M, accuracyLabel, distanceKm, locateUser } from "@/shared/lib/geolocation";

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

/** Метка дома: оранжевая капля 52×62 из public/map, кончик — в точке (23, 56). */
export const HOME_PIN = { size: [52, 62] as [number, number], anchor: [23, 56] as [number, number],
  html: '<img class="map-home" src="/map/marker-home.svg" width="52" height="62" alt="Мой дом" title="Мой дом">' };

type ControlActions = {
  zoomIn(): void;
  zoomOut(): void;
  /** Сдвинуть карту к точке [lon, lat] и приблизить. */
  goTo(point: [number, number]): void;
  /** Центр карты сейчас [lon, lat]. */
  center(): [number, number];
};

/** Грубое место (по IP) дальше этого от карты — скорее VPN, чем пользователь там: не переносим. */
const FAR_KM = 300;

/**
 * Кнопки карты по макету Memphis вместо стандартных: «Приблизить», «Отдалить» и «Где я» (геолокация браузера).
 * Общие для MapGL и растровой карты; провайдер передаёт свои действия.
 */
export function mountControls(el: HTMLElement, actions: ControlActions) {
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  const box = document.createElement("div");
  box.className = "map-controls";
  const button = (icon: string, label: string, onClick: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "map-control";
    b.title = label;
    b.setAttribute("aria-label", label);
    b.innerHTML = `<img src="/map/${icon}.svg" width="50" height="50" alt="">`;
    // карта не должна принимать клик по кнопке за клик по себе (выбор точки, сброс выделения)
    for (const event of ["pointerdown", "mousedown", "dblclick", "touchstart", "wheel"]) {
      b.addEventListener(event, (e) => e.stopPropagation());
    }
    b.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
    return b;
  };
  const locate = button("control-locate", "Где я", () => {
    locate.disabled = true;
    locateUser().then(({ point, accuracyM }) => {
      // Точно (GPS, Wi-Fi) — переносим всегда. Грубо (по IP) — только если это рядом с картой:
      // с VPN браузер «видит» город сервера VPN, и прыжок в другую страну только запутает.
      if (accuracyM > PRECISE_ACCURACY_M && distanceKm(point, actions.center()) > FAR_KM) {
        toast.warning("Браузер не знает точного места", {
          description: `Он определил его по интернет-адресу (${accuracyLabel(accuracyM)}), и это далеко отсюда — так бывает с VPN. Отключите VPN или найдите место поиском.`,
        });
        return;
      }
      actions.goTo(point);
    }, (error: Error) => toast.error(error.message)).finally(() => { locate.disabled = false; });
  });
  box.append(button("control-zoom-in", "Приблизить", actions.zoomIn), button("control-zoom-out", "Отдалить", actions.zoomOut), locate);
  el.appendChild(box);
  return () => box.remove();
}
