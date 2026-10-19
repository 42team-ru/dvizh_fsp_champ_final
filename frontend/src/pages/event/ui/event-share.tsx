import { ShareDialog, ShareTicket } from "@/features/share-link/ui/share-dialog";
import type { useEvent } from "../model/use-event";

type EventModel = ReturnType<typeof useEvent>;

/** «Поделиться» встречей: билет с QR на страницу встречи. */
export function EventShare({ m, open, onOpenChange }: { m: EventModel; open: boolean; onOpenChange(open: boolean): void }) {
  const e = m.event;
  // снятое или удалённое не раздаём: ни QR, ни ссылки
  if (!e || m.moderated) return null;
  const path = `/events/${e.id}`;
  return (
    <ShareDialog open={open} onOpenChange={onOpenChange} path={path} title="Поделиться встречей"
      description="Покажите билет друзьям: наведут камеру — и сразу на странице встречи.">
      <ShareTicket
        path={path}
        number={e.id.slice(0, 4).toUpperCase()}
        sport={e.sport.name}
        title={e.title}
        rows={m.facts.slice(0, 2).map((f) => ({ label: f.label, value: [f.value, f.lines[0]].filter(Boolean).join(" · ") }))}
      />
    </ShareDialog>
  );
}
