import type { EventMapProperties } from "@/shared/api/generated/core/appAPI.schemas";

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
/** Без времени окончания считаем занятие полуторачасовым. */
export const DEFAULT_DURATION = 90 * MINUTE;
/** Шаг метки при перетаскивании. */
export const SNAP = 15 * MINUTE;
/** «Начнутся в ближайший час». */
export const SOON = HOUR;
/** Насколько назад искать начало занятия, которое ещё идёт в выбранный момент. */
export const LOOKBACK = 6 * HOUR;

/** Окно дока: сутки, 3 дня или неделя от начала сегодняшнего дня. */
export type Span = 1 | 3 | 7;
export type Preset = "now" | "today" | "tomorrow" | "weekend" | "week";

/** Момент — «что идёт в это время»; диапазон — «что начнётся с … по …». live: момент следует за часами. */
export type Selection =
  | { mode: "moment"; at: number; live: boolean }
  | { mode: "range"; from: number; to: number; preset?: Preset };

export const startOfDay = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
export const snap = (t: number) => Math.round(t / SNAP) * SNAP;

export const startOf = (p: Pick<EventMapProperties, "startAt">) => new Date(p.startAt).getTime();
export const endOf = (p: Pick<EventMapProperties, "startAt" | "endAt">) =>
  p.endAt ? new Date(p.endAt).getTime() : startOf(p) + DEFAULT_DURATION;
export const isGoing = (p: Pick<EventMapProperties, "startAt" | "endAt">, t: number) => startOf(p) <= t && t < endOf(p);
export const startsSoon = (p: Pick<EventMapProperties, "startAt">, t: number) => startOf(p) > t && startOf(p) <= t + SOON;

/** Сколько событий идёт в каждом часе окна: столбики гистограммы. */
export function histogram(points: Pick<EventMapProperties, "startAt" | "endAt">[], from: number, hours: number) {
  const bars = new Array<number>(hours).fill(0);
  for (const p of points) {
    const first = Math.max(0, Math.floor((startOf(p) - from) / HOUR));
    const last = Math.min(hours - 1, Math.floor((endOf(p) - 1 - from) / HOUR));
    for (let h = first; h <= last; h++) bars[h]++;
  }
  return bars;
}

/** Ближайшие выходные (сб 00:00 — пн 00:00); если уже выходные — с текущего момента. */
export function weekend(now: number) {
  const d = new Date(now);
  const day = d.getDay();
  const sat = startOfDay(now) + ((6 - day + 7) % 7) * DAY;
  if (day === 0) return { from: now, to: startOfDay(now) + DAY };
  return { from: Math.max(now, sat), to: sat + 2 * DAY };
}

/** Диапазон пресета и окно дока, в которое он помещается. */
export function presetRange(preset: Exclude<Preset, "now">, now: number): { from: number; to: number; span: Span } {
  const today = startOfDay(now);
  switch (preset) {
    case "today":
      return { from: now, to: today + DAY, span: 1 };
    case "tomorrow":
      return { from: today + DAY, to: today + 2 * DAY, span: 3 };
    case "weekend": {
      const w = weekend(now);
      return { ...w, span: w.to - today > 3 * DAY ? 7 : 3 };
    }
    case "week":
      return { from: now, to: today + 7 * DAY, span: 7 };
  }
}

const WEEKDAYS = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
const MONTHS = ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЯ", "ИЮН", "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"];
export const dayCaption = (t: number, index: number) => {
  const d = new Date(t);
  const date = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return index === 0 ? `СЕГОДНЯ · ${date}` : index === 1 ? `ЗАВТРА · ${date}` : date;
};
export const hhmm = (t: number) => new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const DAY_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
export const dayShort = (t: number) => {
  const d = new Date(t);
  return `${DAY_SHORT[d.getDay()]} ${d.getDate()}`;
};

/** «1 событие», «3 события», «7 событий». */
export function eventsWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const form = mod10 === 1 && mod100 !== 11 ? "событие" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "события" : "событий";
  return `${n} ${form}`;
}
