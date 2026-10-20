import { useLayoutEffect, useRef, useState } from "react";

/**
 * Масштаб, при котором элемент `measure` целиком влезает в окно по высоте: окно минус `reserve` px
 * (шапка и отступы над и под ним). Применяется как `zoom` к обёртке, внутри которой лежит `measure`.
 * 1 — влезает и так; меньше `min` не уменьшаем. Учитывает зум 2K/4K (ViewportScale, --vp-zoom).
 */
export function useFitHeight(reserve: number, min = 0.7) {
  const measure = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useLayoutEffect(() => {
    const el = measure.current;
    if (!el) return;
    const apply = () => {
      // offsetHeight — в px разметки обёртки, на её zoom не влияет; 0 — блок скрыт (мобильная вёрстка)
      const natural = el.offsetHeight;
      const page = Number(document.documentElement.style.getPropertyValue("--vp-zoom")) || 1;
      const next = natural ? Math.min(1, Math.max(min, (window.innerHeight / page - reserve) / natural)) : 1;
      // без мелких правок: при новом zoom текст переносится иначе, высота чуть меняется — не зацикливаемся
      setZoom((prev) => (Math.abs(prev - next) < 0.02 ? prev : next));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [reserve, min]);

  return { measure, style: zoom < 1 ? { zoom } : undefined };
}
