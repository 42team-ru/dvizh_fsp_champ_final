/** Включено ли в системе «уменьшить движение»: тогда анимации прокрутки на лендинге не запускаются. */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
