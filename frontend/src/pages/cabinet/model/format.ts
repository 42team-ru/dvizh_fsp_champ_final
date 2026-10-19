import { plural } from "@/pages/profile/model/use-profile";

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const pad = (n: number) => String(n).padStart(2, "0");

/** «19:00». */
export const hm = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** «Вт 20 окт». */
export const dayShort = (iso: string) => {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** «18 окт». */
export const dateShort = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** «Вт 20 окт, 19:00». */
export const dayTime = (iso: string) => `${dayShort(iso)}, ${hm(iso)}`;

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** «2 мин назад», «3 часа назад», «вчера в 21:40», «3 дня назад», «18 окт». */
export function ago(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const min = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  if (sameDay(d, now)) {
    const h = Math.floor(min / 60);
    return `${h} ${plural(h, ["час", "часа", "часов"])} назад`;
  }
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (sameDay(d, yesterday)) return `вчера в ${hm(iso)}`;
  const days = Math.floor(min / 1440);
  if (days < 7) return `${days} ${plural(days, ["день", "дня", "дней"])} назад`;
  return dateShort(iso);
}

/** Значения для `<input type="date">` и `<input type="time">` в местном времени. */
export const toDateInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const toTimeInput = hm;

/** Дата и время из полей формы → ISO в UTC. */
export const fromInputs = (date: string, time: string) => new Date(`${date}T${time}`).toISOString();

/** Длительность в минутах между двумя моментами. */
export const minutes = (startIso: string, endIso?: string) =>
  endIso ? Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000) : undefined;
