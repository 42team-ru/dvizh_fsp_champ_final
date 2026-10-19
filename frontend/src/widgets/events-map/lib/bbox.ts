import type { Bbox } from "./map-provider";

/** Долгота в −180…180: 2ГИС при прокрутке по кругу может отдать 200 (docs/map-frontend.md, грабли 3). */
const normalizeLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;
const clampLat = (lat: number) => Math.max(-90, Math.min(90, lat));
/** 3 знака — ~100 м: иначе каждый пиксель сдвига карты — новый ключ кэша. */
const round = (value: number) => Math.round(value * 1000) / 1000;

/** Нормализованный и округлённый bbox для events_map. minLon > maxLon — нормально (180-й меридиан). */
export function toMapParams(bbox: Bbox): Bbox {
  return {
    minLon: round(normalizeLon(bbox.minLon)),
    minLat: round(clampLat(bbox.minLat)),
    maxLon: round(normalizeLon(bbox.maxLon)),
    maxLat: round(clampLat(bbox.maxLat)),
  };
}
