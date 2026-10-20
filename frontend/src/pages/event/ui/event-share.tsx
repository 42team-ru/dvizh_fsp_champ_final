import { ShareDialog } from "@/features/share-link/ui/share-dialog";
import { ShareTicket } from "@/features/share-link/ui/share-posters";
import { coverOf } from "@/entity/event/lib/cover";
import type { useEvent } from "../model/use-event";

type EventModel = ReturnType<typeof useEvent>;

/** «Поделиться» встречей: билет с QR на страницу встречи. */
export function EventShare({
  m,
  open,
  onOpenChange,
}: {
  m: EventModel;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const e = m.event;
  // снятое или удалённое не раздаём: ни QR, ни ссылки
  if (!e || m.moderated) return null;
  const path = `/events/${e.id}`;
  return (
    <ShareDialog
      open={open}
      onOpenChange={onOpenChange}
      path={path}
      title="Поделиться встречей"
      filename={e.title}
      description="Отправь афишу друзьям в чат или выложи в сторис. По QR и ссылке сразу откроется встреча."
    >
      {(format) => (
        <ShareTicket
          format={format}
          path={path}
          number={e.id.slice(0, 4).toUpperCase()}
          sport={e.sport.name}
          level={m.levelLabel}
          cover={coverOf(e)}
          title={e.title}
          rows={[
            {
              label: "КОГДА",
              value: `${m.facts[0].value} · ${m.facts[0].lines[0]}`,
            },
            {
              label: "ГДЕ",
              value:
                e.format === "ONLINE"
                  ? "Онлайн"
                  : e.address || m.facts[1].value,
            },
            {
              label: "ИДУТ",
              value: `${m.going}${e.capacity != null ? ` из ${e.capacity}` : " человек"} · ${m.joinLabel}`,
            },
          ]}
        />
      )}
    </ShareDialog>
  );
}
