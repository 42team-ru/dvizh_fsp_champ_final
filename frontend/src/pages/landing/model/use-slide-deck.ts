import * as React from "react";
import { prefersReducedMotion } from "@/shared/lib/reduced-motion";

const STAGE_W = 1280;
const STAGE_H = 800;
const NEXT_KEYS = new Set(["ArrowDown", "PageDown", " "]);
const PREV_KEYS = new Set(["ArrowUp", "PageUp"]);

/** Слайды вписываются в реальный размер контейнера, включая общий зум приложения.
 * Активный раздел определяется по позиции, даже когда мобильный слайд выше окна. */
export function useSlideDeck(count: number) {
  const scrollerRef = React.useRef<HTMLElement>(null);
  const activeRef = React.useRef(1);
  const [active, setActive] = React.useState(1);
  const slides = React.useCallback(
    () => Array.from(scrollerRef.current?.querySelectorAll<HTMLElement>("[data-slide]") ?? []), [],
  );
  const goTo = React.useCallback((n: number) => {
    const scroller = scrollerRef.current;
    const target = slides()[Math.min(count, Math.max(1, n)) - 1];
    if (!scroller || !target) return;
    scroller.scrollTo({ top: target.offsetTop, behavior: prefersReducedMotion() ? "instant" : "smooth" });
  }, [count, slides]);

  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const scale = Math.min((scroller.clientWidth - 88) / STAGE_W, (scroller.clientHeight - 48) / STAGE_H);
      scroller.style.setProperty("--stage-scale", String(Math.max(0.1, scale)));
      const marker = scroller.scrollTop + scroller.clientHeight * 0.35;
      const sections = slides();
      const current = sections.filter((section) => section.offsetTop <= marker).at(-1) ?? sections[0];
      const next = Number(current?.dataset.slide ?? 1);
      if (next !== activeRef.current) {
        activeRef.current = next;
        setActive(next);
        history.replaceState(history.state, "", `#s${next}`);
      }
      sections.forEach((section) => {
        section.toggleAttribute("data-active", section === current);
        const progress = (scroller.scrollTop - section.offsetTop) / scroller.clientHeight;
        const shift = Math.max(-1, Math.min(1, progress)) * 36;
        section.style.setProperty("--decor-shift", `${shift.toFixed(2)}px`);
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || !(e.target instanceof HTMLElement) ||
        e.target.closest("input, textarea, select, button, a, [role=button], [role=dialog], [contenteditable=true]")) return;
      const current = activeRef.current;
      let next = 0;
      if (NEXT_KEYS.has(e.key) && !e.shiftKey) next = current + 1;
      else if (PREV_KEYS.has(e.key) || (e.key === " " && e.shiftKey)) next = current - 1;
      else if (e.key === "Home") next = 1;
      else if (e.key === "End") next = count;
      if (!next || !desktop.matches) return;
      e.preventDefault();
      goTo(next);
    };
    const start = /^#s(\d+)$/.exec(location.hash);
    if (start) scroller.scrollTo({ top: slides()[Number(start[1]) - 1]?.offsetTop ?? 0, behavior: "instant" });
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(scroller);
    slides().forEach((slide) => resizeObserver.observe(slide));
    update();
    scroller.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      scroller.removeEventListener("scroll", schedule);
      window.removeEventListener("keydown", onKey);
    };
  }, [count, goTo, slides]);
  return { scrollerRef, active, goTo };
}
