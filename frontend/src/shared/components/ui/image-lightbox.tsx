import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, X } from "lucide-react";
import { cn } from "cn";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";

export type LightboxImage = { url: string; caption?: string | null };

const MIN = 1;
const MAX = 4;
const STEP = 0.5;

/**
 * Просмотр фото во всплывающем окне, без перехода на новую вкладку: увеличение кнопками, колесом и двойным кликом,
 * перетаскивание увеличенного снимка, листание стрелками. ← → листают, + − меняют масштаб, 0 — сброс, Esc закрывает.
 */
export function ImageLightbox({ images, index, onIndex, onClose }: {
  images: LightboxImage[];
  /** Какое фото открыто; null — окно закрыто. */
  index: number | null;
  onIndex(index: number): void;
  onClose(): void;
}) {
  const image = index === null ? undefined : images[index];
  return (
    <Dialog open={Boolean(image)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} overlayClassName="bg-ink/90"
        className="flex h-[92dvh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-[24px] border-[2.5px] border-ink bg-ink p-0 text-white ring-0 sm:max-w-[min(1400px,calc(100%-2rem))]">
        <DialogTitle className="sr-only">Фото {index === null ? "" : index + 1} из {images.length}</DialogTitle>
        <DialogDescription className="sr-only">{image?.caption ?? "Фото поста"}</DialogDescription>
        {image && index !== null && (
          <Viewer key={image.url} image={image} index={index} count={images.length} onIndex={onIndex} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Viewer({ image, index, count, onIndex, onClose }: {
  image: LightboxImage;
  index: number;
  count: number;
  onIndex(index: number): void;
  onClose(): void;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  const zoom = useCallback((next: number) => {
    const clamped = Math.min(MAX, Math.max(MIN, next));
    setScale(clamped);
    if (clamped === MIN) setOffset({ x: 0, y: 0 });
  }, []);
  const prev = () => index > 0 && onIndex(index - 1);
  const next = () => index < count - 1 && onIndex(index + 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "+" || e.key === "=") zoom(scale + STEP);
      else if (e.key === "-") zoom(scale - STEP);
      else if (e.key === "0") zoom(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // колесо мыши: без пассивного слушателя, иначе страница под окном тоже прокручивается
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => {
        const n = Math.min(MAX, Math.max(MIN, s * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
        if (n === MIN) setOffset({ x: 0, y: 0 });
        return n;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <>
      <div ref={stage}
        className={cn("relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden select-none",
          scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in")}
        onDoubleClick={() => zoom(scale > 1 ? 1 : 2)}
        onPointerDown={(e) => {
          if (scale === 1) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) setOffset({ x: d.ox + (e.clientX - d.x) / scale, y: d.oy + (e.clientY - d.y) / scale });
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}>
        <img src={image.url} alt={image.caption ?? ""} draggable={false}
          className="max-h-full max-w-full object-contain transition-transform duration-100 ease-out"
          style={{ transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)` }} />

        {index > 0 && (
          <RoundButton label="Предыдущее фото" className="absolute top-1/2 left-3 -translate-y-1/2" onClick={prev}>
            <ChevronLeft className="size-6" />
          </RoundButton>
        )}
        {index < count - 1 && (
          <RoundButton label="Следующее фото" className="absolute top-1/2 right-3 -translate-y-1/2" onClick={next}>
            <ChevronRight className="size-6" />
          </RoundButton>
        )}
        <RoundButton label="Закрыть" className="absolute top-3 right-3" onClick={onClose}>
          <X className="size-6" />
        </RoundButton>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-t-2 border-white/15 px-4 py-3">
        <p className="min-w-0 flex-1 text-sm font-semibold text-white/90">
          {image.caption || " "}
        </p>
        <span className="text-sm font-bold text-white/70">{index + 1} / {count}</span>
        <div className="flex items-center gap-2">
          <RoundButton label="Уменьшить" small disabled={scale <= MIN} onClick={() => zoom(scale - STEP)}>
            <Minus className="size-5" />
          </RoundButton>
          <span className="w-12 text-center text-sm font-bold">{Math.round(scale * 100)}%</span>
          <RoundButton label="Увеличить" small disabled={scale >= MAX} onClick={() => zoom(scale + STEP)}>
            <Plus className="size-5" />
          </RoundButton>
          <RoundButton label="Исходный размер" small disabled={scale === 1} onClick={() => zoom(1)}>
            <RotateCcw className="size-5" />
          </RoundButton>
        </div>
      </div>
    </>
  );
}

function RoundButton({ label, className, small, disabled, onClick, children }: {
  label: string;
  className?: string;
  small?: boolean;
  disabled?: boolean;
  onClick(): void;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn("box-border flex shrink-0 items-center justify-center rounded-full border-2 border-ink bg-card text-foreground shadow-hard-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40",
        small ? "size-10" : "size-12", className)}>
      {children}
    </button>
  );
}
