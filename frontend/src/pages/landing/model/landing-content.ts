/** Тексты и данные лендинга (макет Figma «Лендинг — 01…08» и «параллакс и тайминг»). */

export const REGISTER_URL = "/auth/register";
export const REGISTER_ORG_URL = "/auth/register?type=org";
export const LOGIN_URL = "/auth/login";

/** Пункты шапки: ведут на свой слайд и подсвечиваются, пока он на экране. */
export const NAV = [
  { slide: 7, label: "Как это работает" },
  { slide: 3, label: "Карта" },
  { slide: 5, label: "Бублик" },
  { slide: 6, label: "Организаторам" },
] as const;

/**
 * Слайды по порядку. `dark` — тёмный фон: точки справа полупрозрачные с лаймовой активной.
 * `counter` — цвета счётчика «01 / 08», `hint` — плашка «листай» (нет на последнем).
 */
export const SLIDES = [
  { n: 1, title: "Герой", dark: true, counter: ["text-lime", "text-white"], hint: "dark" },
  { n: 2, title: "Знакомо", dark: false, counter: ["text-ultramarine", "text-ink-muted"], hint: "light" },
  { n: 3, title: "Карта", dark: false, counter: ["text-ultramarine", "text-ink-muted"], hint: "light" },
  { n: 4, title: "Подборка", dark: false, counter: ["text-ultramarine", "text-ink-muted"], hint: "light" },
  { n: 5, title: "Бублик", dark: false, counter: ["text-ultramarine", "text-ink-muted"], hint: "light" },
  { n: 6, title: "Организаторам", dark: true, counter: ["text-lime", "text-lilac-ink"], hint: "dark" },
  { n: 7, title: "Как это работает", dark: false, counter: ["text-ultramarine", "text-ink-muted"], hint: "light" },
  { n: 8, title: "Финал", dark: false, counter: ["text-ultramarine", "text-ink"], hint: null },
] as const;

export type SlideMeta = (typeof SLIDES)[number];

/** Конфетти финала: x, y, поворот, цвет, форма (dot — кружок, sq — квадрат, bar — полоска, pill — капсула). */
export const CONFETTI: [number, number, number, string, "dot" | "sq" | "bar" | "pill"][] = [
  [12, 113, 45, "bg-lime", "dot"], [191, 208, 8, "bg-orange", "bar"], [370, 300, -29, "bg-sky", "bar"],
  [535, 404, 24, "bg-white", "sq"], [714, 496, -13, "bg-sun", "pill"], [875, 596, 40, "bg-mint", "bar"],
  [1057, 132, 3, "bg-lime", "sq"], [1236, 224, -34, "bg-orange", "bar"], [160, 327, 19, "bg-sky", "pill"],
  [339, 420, -18, "bg-white", "sq"], [502, 521, 35, "bg-sun", "bar"], [683, 617, -2, "bg-mint", "bar"],
  [859, 147, -39, "bg-lime", "dot"], [1026, 251, 14, "bg-orange", "bar"], [1206, 344, -23, "bg-sky", "bar"],
  [130, 448, 30, "bg-white", "sq"], [309, 541, -7, "bg-sun", "pill"], [487, 632, -44, "bg-mint", "bar"],
  [653, 177, 9, "bg-lime", "sq"], [831, 268, -28, "bg-orange", "bar"], [995, 370, 25, "bg-sky", "pill"],
  [1175, 465, -12, "bg-white", "sq"], [97, 564, 41, "bg-sun", "bar"], [278, 661, 4, "bg-mint", "bar"],
  [455, 192, -33, "bg-lime", "dot"], [621, 295, 20, "bg-orange", "bar"], [801, 389, -17, "bg-sky", "bar"],
  [965, 492, 36, "bg-white", "sq"], [1144, 586, -1, "bg-sun", "pill"], [82, 117, -38, "bg-mint", "bar"],
  [248, 222, 15, "bg-lime", "sq"], [427, 313, -22, "bg-orange", "bar"], [589, 414, 31, "bg-sky", "pill"],
  [770, 510, -6, "bg-white", "sq"], [947, 601, -43, "bg-sun", "bar"], [1113, 145, 10, "bg-mint", "bar"],
  [51, 237, -27, "bg-lime", "dot"], [215, 339, 26, "bg-orange", "bar"], [396, 434, -11, "bg-sky", "bar"],
  [559, 536, 42, "bg-white", "sq"], [739, 630, 5, "bg-sun", "pill"], [917, 161, -32, "bg-mint", "bar"],
  [1083, 266, 21, "bg-lime", "sq"], [1261, 358, -16, "bg-orange", "bar"], [183, 458, 37, "bg-sky", "pill"],
  [365, 555, 0, "bg-white", "sq"],
];

/** Высоты столбиков на полосе времени (слайд «Карта»); с 11-го по 21-й — внутри выбранного диапазона. */
export const TIMELINE_BARS = [
  12, 8, 4, 4, 8, 16, 24, 28, 20, 16, 16, 20, 16, 16, 20, 24, 32, 40, 44, 36, 24, 16, 8, 8, 12, 20, 28, 32, 24, 20,
  16, 20, 24, 28, 36, 40,
];
