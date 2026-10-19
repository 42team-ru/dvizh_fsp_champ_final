import { useEffect, useRef, useState } from "react";
import { createPointPicker, hasMapKey, type PointPicker } from "../lib/map-provider";

/** Мини-карта места события: клик ставит точку. value и onChange — [lon, lat]; без onChange — только показ. */
export function LocationPicker({ value, onChange, className }: {
  value: [number, number] | null;
  onChange?(point: [number, number]): void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const picker = useRef<PointPicker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasMapKey() || !container.current) return;
    let cancelled = false;
    createPointPicker(container.current, value, onChange ? (point) => onChangeRef.current?.(point) : undefined).then((p) => {
      if (cancelled) return p.destroy();
      picker.current = p;
    }).catch((error) => {
      console.error("2GIS map failed to load", error);
      setFailed(true);
    });
    return () => {
      cancelled = true;
      picker.current?.destroy();
      picker.current = null;
    };
    // Карта создаётся один раз; дальнейшие изменения value ставит сам пикер.
  }, []);

  if (!hasMapKey() || failed) {
    return (
      <p className={`rounded-2xl border-2 border-dashed border-ink p-4 text-sm font-semibold text-muted-foreground ${className ?? ""}`}>
        {failed ? "Карта 2ГИС не загрузилась." : "Для выбора места нужен ключ 2ГИС (VITE_2GIS_KEY)."}
      </p>
    );
  }
  return <div ref={container} className={`overflow-hidden rounded-2xl border-2 border-ink ${className ?? ""}`} />;
}
