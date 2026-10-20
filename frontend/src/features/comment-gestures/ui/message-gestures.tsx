import { useRef, useState, type ReactNode } from "react";
import { Copy, Reply, Trash2 } from "lucide-react";
import { cn } from "cn";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { toast } from "@/shared/lib/toast";

/** Свайп вправо дальше этого — ответ. */
const SWIPE = 64;
/** Удержание дольше этого — меню действий. */
const HOLD_MS = 450;

/**
 * Жесты сообщения на сенсорных экранах: свайп вправо — «Ответить», долгое нажатие — меню.
 * Мышь не трогаем: на десктопе есть кнопки под сообщением. Вертикальная прокрутка не мешает (touch-action: pan-y).
 */
export function MessageGestures({ onReply, onHold, className, children }: {
  onReply?: () => void;
  onHold?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<"x" | "y" | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const stopHold = () => window.clearTimeout(timer.current);
  const end = () => {
    stopHold();
    if (dx >= SWIPE) {
      navigator.vibrate?.(10);
      onReply?.();
    }
    start.current = null;
    axis.current = null;
    setDx(0);
  };
  return (
    <div className={cn("relative touch-pan-y select-none", className)}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse") return;
        start.current = { x: e.clientX, y: e.clientY };
        if (onHold) timer.current = window.setTimeout(() => {
          start.current = null;
          navigator.vibrate?.(15);
          onHold();
        }, HOLD_MS);
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        const x = e.clientX - start.current.x;
        const y = e.clientY - start.current.y;
        if (Math.abs(x) > 8 || Math.abs(y) > 8) stopHold();
        if (!axis.current && (Math.abs(x) > 8 || Math.abs(y) > 8)) axis.current = Math.abs(x) > Math.abs(y) ? "x" : "y";
        if (axis.current === "x" && onReply) setDx(Math.max(0, Math.min(x, SWIPE + 20)));
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onContextMenu={(e) => { if (onHold && e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType !== "mouse") e.preventDefault(); }}>
      <span aria-hidden className="absolute top-1/2 left-0 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-lime"
        style={{ opacity: Math.min(1, dx / SWIPE), transform: `translateY(-50%) scale(${0.6 + 0.4 * Math.min(1, dx / SWIPE)})` }}>
        <Reply className="size-4" />
      </span>
      <div className={cn("relative", dx === 0 && "transition-transform duration-200")} style={{ transform: `translateX(${dx}px)` }}>
        {children}
      </div>
    </div>
  );
}

/** Меню по долгому нажатию: шторка снизу с крупными кнопками. */
export function MessageActionsSheet({ open, text, onClose, onReply, onRemove }: {
  open: boolean;
  text?: string;
  onClose: () => void;
  onReply?: () => void;
  onRemove?: () => void;
}) {
  const act = (fn: () => void) => () => { onClose(); fn(); };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text ?? "");
      toast.success("Текст скопирован");
    } catch {
      toast.error("Не удалось скопировать");
    }
  };
  const item = "flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-ink bg-card px-4 text-left text-base font-extrabold active:bg-muted";
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent showCloseButton={false}
        className="top-auto bottom-0 max-w-none translate-y-0 gap-3 rounded-t-[24px] rounded-b-none border-[2.5px] border-ink bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-md">
        <div aria-hidden className="mx-auto h-[5px] w-11 rounded-full bg-ink" />
        <DialogTitle className="sr-only">Действия с сообщением</DialogTitle>
        {text && <DialogDescription className="line-clamp-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{text}</DialogDescription>}
        {onReply && <button type="button" className={item} onClick={act(onReply)}><Reply className="size-5" />Ответить</button>}
        {text && <button type="button" className={item} onClick={act(() => void copy())}><Copy className="size-5" />Скопировать текст</button>}
        {onRemove && <button type="button" className={cn(item, "text-destructive")} onClick={act(onRemove)}><Trash2 className="size-5" />Удалить сообщение</button>}
      </DialogContent>
    </Dialog>
  );
}
