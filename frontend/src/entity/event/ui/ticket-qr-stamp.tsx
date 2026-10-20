import { QrCode } from "@/shared/components/ui/qr-code";
import { cn } from "cn";

/** Штамп на корешке подтверждённого билета; QR ведёт на страницу встречи. */
export function TicketQrStamp({ eventId, className }: { eventId: string; className?: string }) {
  return (
    <div className={cn("box-border flex w-fit max-w-full shrink-0 -rotate-3 items-center gap-3 rounded-[14px] border-2 border-ink bg-card p-2 shadow-hard-sm", className)}>
      <QrCode path={`/events/${eventId}`} label="QR-код: страница встречи" className="size-[76px] rounded-none border-0" />
      <div className="flex min-w-0 flex-col gap-1 pr-1">
        <span className="text-[11px] font-extrabold tracking-[1px] text-ultramarine">ПОКАЖИ</span>
        <span className="font-display text-sm font-extrabold text-ink">на входе</span>
        <span className="text-xs font-semibold text-muted-foreground">организатору</span>
      </div>
    </div>
  );
}
