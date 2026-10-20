import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Crosshair } from "lucide-react";
import type { FocusPoint } from "@/shared/api/generated/core/appAPI.schemas";
import { objectPosition } from "@/entity/event/lib/cover";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { cn } from "cn";

const CENTER: FocusPoint = { x: 50, y: 50 };
/** Кадры, в которых фото реально показывается: карточка ленты, билет на главной, квадратная миниатюра. */
const FRAMES = [
  { label: "Карточка", aspect: "aspect-[16/10]" },
  { label: "Билет", aspect: "aspect-[3/1]" },
  { label: "Миниатюра", aspect: "aspect-square w-1/2" },
];
const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)));

/**
 * Выбор точки фокуса фото: клик или перетаскивание ставит прицел, стрелки двигают его (Shift — крупнее).
 * Справа — живые превью обрезки. `onSave` получает точку в процентах.
 */
export function FocusPickerDialog({ open, src, initial, busy, title = "Что главное на фото?", onSave, onOpenChange }: {
  open: boolean;
  src?: string;
  initial?: FocusPoint | null;
  busy?: boolean;
  title?: string;
  onSave(focus: FocusPoint): void;
  onOpenChange(open: boolean): void;
}) {
  const [focus, setFocus] = useState<FocusPoint>(initial ?? CENTER);
  const area = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  useEffect(() => { if (open) setFocus(initial ?? CENTER); }, [open, initial]);

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const box = area.current?.getBoundingClientRect();
    if (!box) return;
    setFocus({ x: clamp(((e.clientX - box.left) / box.width) * 100), y: clamp(((e.clientY - box.top) / box.height) * 100) });
  };
  const nudge = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!move) return;
    e.preventDefault();
    setFocus((f) => ({ x: clamp(f.x + move[0]), y: clamp(f.y + move[1]) }));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Нажмите на главное — лицо, мяч, сцену. Превью в ленте и на главной обрежутся так, чтобы эта точка осталась в кадре.
        </DialogDescription>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_240px]">
          <div
            ref={area}
            role="slider"
            tabIndex={0}
            aria-label="Точка фокуса"
            aria-valuetext={`${focus.x}% слева, ${focus.y}% сверху`}
            onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e); }}
            onPointerMove={(e) => dragging.current && pick(e)}
            onPointerUp={() => (dragging.current = false)}
            onKeyDown={nudge}
            className="relative cursor-crosshair touch-none self-start overflow-hidden rounded-[18px] border-2 border-ink bg-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {src && <img src={src} alt="" draggable={false} className="block max-h-[60dvh] w-full object-contain select-none" />}
            <span
              aria-hidden
              className="pointer-events-none absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white bg-ink/40 shadow-[0_0_0_2px_var(--ink)]"
              style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
            >
              <Crosshair className="size-5 text-white" strokeWidth={2.6} />
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {FRAMES.map((f) => (
              <figure key={f.label} className="flex flex-col gap-1">
                <figcaption className="text-[11px] font-extrabold tracking-[1px] text-muted-foreground">{f.label.toUpperCase()}</figcaption>
                <div className={cn("overflow-hidden rounded-[12px] border-2 border-ink bg-muted", f.aspect)}>
                  {src && <img src={src} alt="" className="size-full object-cover" style={{ objectPosition: objectPosition(focus) }} />}
                </div>
              </figure>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => setFocus(CENTER)}>По центру</Button>
          <Button variant="soft" disabled={busy} onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button variant="ink" disabled={busy || !src} onClick={() => onSave(focus)}>{busy ? "Сохраняем…" : "Сохранить"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
