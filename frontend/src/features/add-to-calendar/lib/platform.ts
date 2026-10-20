export type CalendarPlatform = "ios" | "android" | "desktop";

/**
 * Куда вести «В календарь»: iOS сам открывает .ics в Календаре, Android лучше отправить в Google Календарь,
 * компьютеру — предложить веб-календари и файл. iPadOS притворяется Mac, его выдаёт сенсорный экран.
 */
export function calendarPlatform(): CalendarPlatform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}
