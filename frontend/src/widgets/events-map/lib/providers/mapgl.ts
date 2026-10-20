import { load } from "@2gis/mapgl";
import { Clusterer } from "@2gis/mapgl-clusterer";
import { DEFAULT_CENTER, KEY, type Bbox, type MapPoint, type MapProvider, type PointPicker } from "../map-contract";
import { HOME_PIN, clusterHtml, contains, mount, mountControls, pad, pinHtml, vpZoom } from "../map-utils";

type MapglApi = Awaited<ReturnType<typeof load>>;
type MapglMap = InstanceType<MapglApi["Map"]>;
type HtmlMarker = InstanceType<MapglApi["HtmlMarker"]>;

const STYLE = (import.meta.env.VITE_2GIS_STYLE_ID as string | undefined)?.trim();
/**
 * Свой стиль из public/map-style (собирает scripts/build-map-style.mjs): не зависит от Редактора стилей.
 * Пути внутри — относительно базового URL. ID из Редактора, если задан, важнее.
 */
const LOCAL_STYLE = { stylePath: "style.json", iconsPath: "icons/", fontsPath: "fonts/", modelsPath: "models/" };
const localStyleUrl = () => `${window.location.origin}/map-style/`;
const INIT_TIMEOUT = 15_000;
let loading: Promise<MapglApi> | null = null;

/** Ограничиваем ожидание SDK: заблокированный CDN не должен навсегда оставлять пустой контейнер. */
function loadMapgl(): Promise<MapglApi> {
  if (!loading) {
    loading = new Promise<MapglApi>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("2GIS MapGL: SDK loading timed out")), INIT_TIMEOUT);
      // Рекомендованный 2ГИС канал v1 со стабильным API; версия npm-пакета закреплена отдельно.
      load("https://mapgl.2gis.com/api/js/v1").then(resolve, reject).finally(() => window.clearTimeout(timer));
    }).catch((error) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

/**
 * Ждём отрисовки тайлов, а не только конструктора: неверный ключ может проявиться асинхронно.
 * `localStyle` — загрузка своего стиля: она прерывает стандартный, и его styleloaderror — не ошибка.
 */
function waitForMap(map: MapglMap, localStyle?: Promise<unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    const canvas = map.getCanvas();
    let styleLoaded = false;
    const cleanup = () => {
      window.clearTimeout(timer);
      map.off("idle", ready);
      map.off("styleload", loaded);
      map.off("styleloaderror", failed);
      canvas.removeEventListener("webglcontextlost", failed);
    };
    const ready = () => {
      if (styleLoaded) { cleanup(); resolve(); }
    };
    const loaded = () => { styleLoaded = true; };
    const failed = () => { cleanup(); reject(new Error("2GIS MapGL: style, API key or WebGL initialization failed")); };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("2GIS MapGL: map initialization timed out (check key permissions)"));
    }, INIT_TIMEOUT);
    map.on("idle", ready);
    if (localStyle) localStyle.then(loaded, failed);
    else {
      map.on("styleload", loaded);
      map.on("styleloaderror", failed);
    }
    canvas.addEventListener("webglcontextlost", failed);
  });
}

async function createMap(container: HTMLElement, center: [number, number], zoom: number, locked = false) {
  const api = await loadMapgl();
  if (!api.isSupported()) throw new Error("2GIS MapGL: WebGL is not supported");
  const el = mount(container);
  let map: MapglMap | undefined;
  try {
    map = new api.Map(el, {
      center, zoom, key: KEY,
      ...(STYLE ? { style: STYLE } : {}),
      styleZoom: zoom,
      pitch: 0, rotation: 0,
      disablePitchByUserInteraction: true,
      disableRotationByUserInteraction: true,
      disableDragging: locked,
      disableZoomOnScroll: locked,
      // свои кнопки по макету (mountControls), стандартные MapGL не нужны
      zoomControl: false,
      enableTrackResize: true,
    });
    const localStyle = STYLE ? undefined : map.setStyleFromUrl(localStyleUrl(), LOCAL_STYLE);
    // У MapGL нет общего флага запрета всех жестов. Останавливаем их до обработчиков SDK,
    // сохраняя ссылки копирайта и прокрутку страницы интерактивными.
    if (locked) {
      map.getCanvas().tabIndex = -1;
      const stopGesture = (event: Event) => {
        if (!(event.target instanceof Element && event.target.closest("a"))) event.stopPropagation();
      };
      for (const event of ["pointerdown", "mousedown", "dblclick", "touchstart", "touchmove", "wheel", "keydown"]) {
        el.addEventListener(event, stopGesture, { capture: true, passive: true });
      }
    }
    await waitForMap(map, localStyle);
    if (!locked) {
      const m = map;
      mountControls(el, {
        zoomIn: () => m.setStyleZoom(Math.min(m.getMaxZoom(), m.getStyleZoom() + 1)),
        zoomOut: () => m.setStyleZoom(m.getStyleZoom() - 1),
      });
    }
    return { api, map, el };
  } catch (error) {
    try { map?.destroy(); } finally { el.remove(); }
    throw error;
  }
}

function readBbox(map: MapglMap): Bbox {
  const { southWest, northEast } = map.getBounds();
  return { minLon: southWest[0], minLat: southWest[1], maxLon: northEast[0], maxLat: northEast[1] };
}

/** HTML тот же, что у DG.divIcon; anchor=0 оставляет позиционирование пина существующему CSS. */
function pinContent(point: MapPoint, active: boolean) {
  const el = document.createElement("div");
  el.className = "map-pin-host";
  el.innerHTML = pinHtml(point, active);
  return el;
}

export async function createEventsMap(container: HTMLElement, center = DEFAULT_CENTER, zoom = 12): Promise<MapProvider> {
  const { api, map, el } = await createMap(container, center, zoom);
  let points: MapPoint[] = [];
  let activePoint: MapPoint | null = null;
  let focused: HtmlMarker | undefined;
  let home: HtmlMarker | undefined;
  let clickHandler: ((point: MapPoint) => void) | undefined;
  const subscriptions = new Set<() => void>();
  const clusterers: Clusterer[] = [];
  try {
    // Серые точки не поглощают цветные. Выбранный пин рисуем отдельно и всегда видимым.
    for (const muted of [true, false]) {
      const clusterer = new Clusterer(map, {
        radius: 56 * vpZoom(),
        clusterStyle: (count) => ({ type: "html", html: clusterHtml(count, muted), anchor: [20 * vpZoom(), 20 * vpZoom()], zIndex: muted ? 0 : 1 }),
      });
      clusterers.push(clusterer);
      clusterer.on("click", (event) => {
        if (event.target.type === "marker") clickHandler?.(event.target.data.userData as MapPoint);
        else {
          const members = event.target.data;
          const center = members.reduce((sum, p) => [sum[0] + p.coordinates[0], sum[1] + p.coordinates[1]], [0, 0]);
          map.setCenter([center[0] / members.length, center[1] / members.length]);
          map.setStyleZoom(Math.min(map.getMaxZoom(), map.getStyleZoom() + 2));
        }
      });
    }
  } catch (error) {
    clusterers.forEach((clusterer) => clusterer.destroy());
    try { map.destroy(); } finally { el.remove(); }
    throw error;
  }

  const render = () => {
    for (const [index, muted] of [true, false].entries()) {
      clusterers[index].load(points.filter((point) => Boolean(point.muted) === muted && point.id !== activePoint?.id).map((point) => ({
        type: "html" as const,
        coordinates: point.coordinates,
        html: pinContent(point, false),
        anchor: [0, 0],
        userData: point,
        zIndex: muted ? 0 : 1,
      })));
    }
    focused?.destroy();
    focused = undefined;
    if (activePoint) {
      const point = points.find((p) => p.id === activePoint?.id) ?? activePoint;
      const content = pinContent(point, true);
      content.addEventListener("click", () => clickHandler?.(point));
      focused = new api.HtmlMarker(map, { coordinates: point.coordinates, html: content, anchor: [0, 0], zIndex: 2 });
    }
  };

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
      const unsubscribe = () => {
        window.clearTimeout(timer);
        map.off("moveend", handler);
        subscriptions.delete(unsubscribe);
      };
      subscriptions.add(unsubscribe);
      map.on("moveend", handler);
      emit();
      return unsubscribe;
    },
    setPoints(next) { points = next; render(); },
    onPointClick(cb) { clickHandler = cb; },
    focus(point) {
      activePoint = point;
      if (point) {
        map.setCenter(point.coordinates);
        map.setStyleZoom(Math.max(map.getStyleZoom(), 15));
      }
      render();
    },
    setHome(point) {
      home?.destroy();
      home = point ? new api.HtmlMarker(map, {
        coordinates: point, anchor: [HOME_PIN.anchor[0] * vpZoom(), HOME_PIN.anchor[1] * vpZoom()], zIndex: 3,
        html: HOME_PIN.html,
        preventMapInteractions: false,
      }) : undefined;
      if (home) home.getContent().style.pointerEvents = "none";
    },
    destroy() {
      subscriptions.forEach((unsubscribe) => unsubscribe());
      clusterers.forEach((clusterer) => clusterer.destroy());
      focused?.destroy();
      home?.destroy();
      try { map.destroy(); } finally { el.remove(); }
    },
  };
}

export async function createPointPicker(container: HTMLElement, initial: [number, number] | null,
  onPick?: (point: [number, number]) => void): Promise<PointPicker> {
  const { api, map, el } = await createMap(container, initial ?? DEFAULT_CENTER, initial ? 15 : 12, !onPick);
  let marker: HtmlMarker | undefined;
  const setPoint = (point: [number, number] | null) => {
    marker?.destroy();
    marker = point ? new api.HtmlMarker(map, {
      coordinates: point, anchor: [0, 0], html: '<span class="map-dot"></span>', preventMapInteractions: false,
    }) : undefined;
    if (marker) marker.getContent().style.pointerEvents = "none";
  };
  try {
    setPoint(initial);
    if (onPick) map.on("click", (event) => {
      const point: [number, number] = [event.lngLat[0], event.lngLat[1]];
      setPoint(point);
      onPick(point);
    });
  } catch (error) {
    marker?.destroy();
    try { map.destroy(); } finally { el.remove(); }
    throw error;
  }
  return {
    setPoint,
    show(point, zoom = 16) {
      setPoint(point);
      map.setCenter(point);
      map.setStyleZoom(zoom);
    },
    destroy() {
      marker?.destroy();
      try { map.destroy(); } finally { el.remove(); }
    },
  };
}
