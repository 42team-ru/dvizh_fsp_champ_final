import { cn } from "cn";
import { JOIN_MODE_LABEL } from "@/shared/lib/statuses";

/** Полоса билета: длинный вид сокращается, режим и номер остаются читаемыми. */
export function TicketStrip({ id, kind, joinMode, compact = false, className }: {
  id: string;
  kind: string;
  joinMode: "FREE" | "REQUEST";
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 gap-3 bg-primary text-[11px] font-extrabold tracking-[1px]", compact ? "flex-col px-5 py-4" : "items-center justify-between px-6", className)}>
      <span title={`Посадочный талон · ${kind}`} className="min-w-0 truncate text-lime">
        ПОСАДОЧНЫЙ ТАЛОН · {kind.toUpperCase()}
      </span>
      <div className="flex shrink-0 items-center justify-between gap-3">
        <span className="text-primary-foreground">{JOIN_MODE_LABEL[joinMode].toUpperCase()}</span>
        <span className="shrink-0 rounded-pill bg-lime px-3 py-1 whitespace-nowrap text-ink">
          № {id.slice(0, 4).toUpperCase()}
        </span>
      </div>
    </div>
  );
}
