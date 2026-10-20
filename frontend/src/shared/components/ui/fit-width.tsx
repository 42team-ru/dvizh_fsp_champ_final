import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "cn";

/**
 * Вписывает вёрстку фиксированной ширины (макет на `width` px) в более узкое окно: уменьшает её целиком
 * через `zoom`, как ViewportScale делает на 2K/4K. Шире `width` ничего не меняется — макет 1 в 1.
 * Нужна страницам, нарисованным под 1280 без резиновых колонок (билет события, «Активность»), на 1024–1279.
 */
export function FitWidth({ width, className, children }: { width: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => setZoom(Math.min(1, el.clientWidth / width));
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={ref} className={cn("w-full", className)}>
      <div style={zoom < 1 ? { zoom } : undefined}>{children}</div>
    </div>
  );
}
