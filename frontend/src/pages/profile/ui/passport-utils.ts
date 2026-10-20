import type {
  EventSummaryResponseKind,
  MeResponseSystemRole,
  UserSportResponseLevel,
} from "@/shared/api/generated/core/appAPI.schemas";

export const SPORT_LEVEL_LABEL: Record<UserSportResponseLevel, string> = {
  BEGINNER: "Новичок",
  AMATEUR: "Любитель",
  PRO: "Профи",
};

/** Сколько делений из четырёх закрашено у уровня. */
export const LEVEL_PIPS: Record<UserSportResponseLevel, number> = {
  BEGINNER: 1,
  AMATEUR: 2,
  PRO: 4,
};

export const ROLE_LABEL: Record<MeResponseSystemRole, string> = {
  USER: "Участник",
  ORG: "Организация",
  ADMIN: "Администратор",
};

export const KIND_LABEL: Record<EventSummaryResponseKind, string> = {
  TRAINING: "ТРЕНИРОВКА",
  GAME: "ИГРА",
  MEETUP: "ВСТРЕЧА",
  AMATEUR_TOURNAMENT: "ЛЮБИТ. ТУРНИР",
};

export const MOOD_LABEL: Record<string, string> = {
  idle: "спокойный",
  happy: "радостный",
  surprised: "удивлённый",
  thinking: "задумчивый",
  sad: "грустный",
  wink: "игривый",
  offended: "обиженный",
  sleep: "сонный",
};

const pad = (n: number) => String(n).padStart(2, "0");

/** 12.03.2026 */
export function dateFull(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** 12.03.26 */
export function dateShort(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
}

const WEEKDAY = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** «сегодня · 19:30», «завтра · 10:00», «сб 24.10 · 9:00». */
export function whenLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const days = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
  const time = `${d.getHours()}:${pad(d.getMinutes())}`;
  if (days === 0) return `сегодня · ${time}`;
  if (days === 1) return `завтра · ${time}`;
  return `${WEEKDAY.format(d)} ${pad(d.getDate())}.${pad(d.getMonth() + 1)} · ${time}`;
}

/** Номер паспорта из идентификатора пользователя: SR-4F9A21. */
export function passportNumber(id?: string) {
  const hex = (id ?? "").replace(/-/g, "").slice(0, 6).toUpperCase();
  return `SR-${hex || "000000"}`;
}

const LETTERS: Record<string, string> = {
  а: "A", б: "B", в: "V", г: "G", д: "D", е: "E", ё: "E", ж: "ZH", з: "Z", и: "I", й: "I", к: "K",
  л: "L", м: "M", н: "N", о: "O", п: "P", р: "R", с: "S", т: "T", у: "U", ф: "F", х: "KH", ц: "TS",
  ч: "CH", ш: "SH", щ: "SHCH", ъ: "", ы: "Y", ь: "", э: "E", ю: "IU", я: "IA",
};

/** Латиница для машиночитаемой зоны: «Соколова» → SOKOLOVA. */
export function translit(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .split("")
    .map((ch) => LETTERS[ch] ?? (/[a-z0-9]/.test(ch) ? ch.toUpperCase() : ""))
    .join("");
}

const MRZ_WIDTH = 44;
const mrzLine = (value: string) => value.slice(0, MRZ_WIDTH).padEnd(MRZ_WIDTH, "<");

/** Две строки машиночитаемой зоны паспорта. */
export function mrzLines(user: { lastName?: string; firstName?: string; username?: string; city?: string; createdAt?: string; id?: string }) {
  const issued = user.createdAt ? new Date(user.createdAt) : undefined;
  const yymmdd = issued ? `${String(issued.getFullYear()).slice(2)}${pad(issued.getMonth() + 1)}${pad(issued.getDate())}` : "<<<<<<";
  const number = passportNumber(user.id).replace("-", "");
  return [
    mrzLine(`P<DVZH<${translit(user.lastName || user.username)}<<${translit(user.firstName)}`),
    mrzLine(`${number}<${yymmdd}<${translit(user.city)}<<${translit(user.username)}`),
  ];
}
