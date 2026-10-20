import type { EventMapProperties } from "@/shared/api/generated/core/appAPI.schemas";

export type Bbox = { minLon: number; minLat: number; maxLon: number; maxLat: number };
/** muted — вне выбранного времени: серая точка без подписи; note — вторая строка метки вместо времени начала. */
export type MapPoint = { id: string; coordinates: [number, number]; data: EventMapProperties; muted?: boolean; note?: string };

/** fetch — область для запроса (видимая с запасом), visible — что на экране сейчас. */
export type Viewport = { fetch: Bbox; visible: Bbox };

export interface MapProvider {
  /** Не чаще раза в 500 мс после остановки карты; fetch меняется, только когда экран выходит за уже загруженное. */
  onViewportChange(cb: (viewport: Viewport) => void): () => void;
  setPoints(points: MapPoint[]): void;
  onPointClick(cb: (point: MapPoint) => void): void;
  /** Показать точку: сдвинуть карту и подсветить метку (выбор в ленте времени). */
  focus(point: MapPoint | null): void;
  /** Отдельная метка дома [lon, lat]: не кластеризуется и не кликается; null — убрать. */
  setHome(point: [number, number] | null): void;
  destroy(): void;
}

/** Красноярск: [lon, lat]. */
export const DEFAULT_CENTER: [number, number] = [92.8526, 56.0106];
export const KEY = import.meta.env.VITE_2GIS_KEY as string | undefined;

export const hasMapKey = () => Boolean(KEY);

export interface PointPicker {
  /** Поставить маркер программно (например, при открытии формы с уже выбранной точкой). */
  setPoint(point: [number, number] | null): void;
  /** Поставить маркер и приблизить карту к точке (выбор подсказки адреса). */
  show(point: [number, number], zoom?: number): void;
  destroy(): void;
}

