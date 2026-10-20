import type { EventResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { cn } from "cn";

/** Штамп организатора «ДОПУЩЕН» на корешке: только пока запись подтверждена — после «Отменить» пропадает. */
export function TicketAdmittedStamp({ event: e, className }: { event: EventResponse; className?: string }) {
  const organizer = e.organization?.name ?? `${e.author.firstName} ${e.author.lastName?.[0] ?? ""}.`;
  const date = new Date(e.nextOccurrence?.startAt ?? e.startAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
  return (
    <div role="img" aria-label={`Штамп: допущен, организатор ${organizer}`}
      className={cn("pointer-events-none absolute h-[66px] w-[178px] rotate-[9deg] text-primary", className)}>
      <img src="/event/stamp-admitted.svg" alt="" className="absolute inset-0 size-full max-w-none" />
      <p className="absolute inset-x-0 top-3 text-center font-display text-[20px] font-extrabold">ДОПУЩЕН</p>
      <p className="absolute inset-x-0 top-10 truncate px-3 text-center text-[9px] font-extrabold tracking-[1px]">орг. {organizer} · {date}</p>
    </div>
  );
}
