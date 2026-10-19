import { toBackendUrl } from "@/shared/api/mutators/authMutator";

export const IMG = "/profile/gallery";
export const ABOUT_LIMIT = 6;
export const CAPTION_MAX = 300;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Ссылка /api/files/{id} от бэка → адрес для img. */
export const imageUrl = (url: string) => toBackendUrl(url).toString();

/** Плашки видов спорта: цвет закреплён за видом, чтобы «Бег» везде был одного цвета. */
const SPORT_TONES = ["bg-sky-soft", "bg-mint-soft", "bg-lime-soft", "bg-peach", "bg-lavender-soft", "bg-rose"];
/** Подложки под фото, пока картинка грузится. */
const COVER_TONES = ["bg-sky", "bg-mint", "bg-photo-lime", "bg-peach", "bg-lavender-soft", "bg-rose"];

const hash = (key: string) => [...key].reduce((sum, c) => (sum * 31 + c.charCodeAt(0)) >>> 0, 7);
export const sportTone = (sportId: string) => SPORT_TONES[hash(sportId) % SPORT_TONES.length];
export const coverTone = (key: string) => COVER_TONES[hash(key) % COVER_TONES.length];

/** Склонение по числу: plural(5, ["фото", "фото", "фото"]). */
export function plural(n: number, forms: readonly [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export const foldersWord = (n: number) => plural(n, ["папка", "папки", "папок"]);

const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

/** «18 окт 2026». */
export function dateLong(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** «18 окт». */
export function dateShort(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}`;
}

/** «18 окт 2026, 19:42». */
export function dateTime(iso: string) {
  const d = new Date(iso);
  return `${dateLong(iso)}, ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Проверка файла до отправки; текст как у сервера. null — файл подходит. */
export function fileProblem(file: File) {
  if (!IMAGE_TYPES.includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) {
    return "Это не картинка или файл больше 5 МБ. Подойдут JPG, PNG и WebP.";
  }
  return null;
}
