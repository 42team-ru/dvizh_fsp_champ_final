import { cn } from "cn"

/** Штамп «Отменено»: оттиск поверх визы или билета, цвет — тёмно-оранжевый. */
export function CancelledStamp({ className, big }: { className?: string; big?: boolean }) {
  return (
    <div className={cn("pointer-events-none absolute text-orange-ink", className)}>
      <img src="/event/stamp-cancelled.svg" alt="" className="absolute inset-0 size-full max-w-none" />
      <p className={cn("absolute inset-0 flex items-center justify-center font-display font-extrabold", big ? "text-[20px]" : "text-[11px]")}>
        ОТМЕНЕНО
      </p>
    </div>
  );
}
