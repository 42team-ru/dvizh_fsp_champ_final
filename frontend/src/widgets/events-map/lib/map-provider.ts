import { DEFAULT_CENTER, type MapProvider, type PointPicker } from "./map-contract";
import * as raster from "./providers/raster";
import "./map-pins.css";

export { DEFAULT_CENTER, hasMapKey } from "./map-contract";
export type { Bbox, MapPoint, MapProvider, PointPicker, Viewport } from "./map-contract";
export { inBbox } from "./map-utils";

/** Query-переключатель позволяет сравнить движки на одной сборке; неизвестное значение не переопределяет env. */
function selectedProvider(): "raster" | "mapgl" {
  const query = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("map");
  if (query === "raster" || query === "mapgl") return query;
  return import.meta.env.VITE_2GIS_MAP === "mapgl" ? "mapgl" : "raster";
}

async function withFallback<T>(createMapgl: () => Promise<T>, createRaster: () => Promise<T>): Promise<T> {
  if (selectedProvider() === "mapgl") {
    try {
      return await createMapgl();
    } catch (error) {
      console.warn("2GIS MapGL failed to initialize; falling back to RasterJS", error);
    }
  }
  return createRaster();
}

/** SDK MapGL и Clusterer загружаются только при выборе MapGL. Ошибки импорта тоже запускают fallback. */
export function createMapProvider(container: HTMLElement, center = DEFAULT_CENTER, zoom = 12): Promise<MapProvider> {
  return withFallback(
    async () => (await import("./providers/mapgl")).createEventsMap(container, center, zoom),
    () => raster.createEventsMap(container, center, zoom),
  );
}

/** Сохраняем имя фабрики, которым уже пользуются экраны. */
export const createEventsMap = createMapProvider;

export function createPointPicker(container: HTMLElement, initial: [number, number] | null,
  onPick?: (point: [number, number]) => void): Promise<PointPicker> {
  return withFallback(
    async () => (await import("./providers/mapgl")).createPointPicker(container, initial, onPick),
    () => raster.createPointPicker(container, initial, onPick),
  );
}
