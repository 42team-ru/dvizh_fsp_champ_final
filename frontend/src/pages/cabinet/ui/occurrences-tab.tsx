import { useState } from "react";
import { CalendarDays, Plus, X } from "lucide-react";
import { cn } from "cn";
import { useOccurrencesAttendees, useOccurrencesList } from "@/shared/api/generated/core/occurrences/occurrences";
import type { OccurrenceResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { fullName } from "@/pages/event/model/use-event";
import type { ManagedEvent } from "../model/use-manage-event";
import { dateShort, dayShort, dayTime, hm } from "../model/format";
import { Avatar, Chip, OrangeButton, PillTabs } from "./parts";
import { AddDateDialog, CancelDialog, ConfirmDialog, RescheduleDialog } from "./occurrence-dialogs";

const SOURCE: Record<string, string> = { RULE: "По расписанию", EXTRA: "Добавлено", SINGLE: "Разовое" };
const STEP = 8;
const MONTH_MS = 30 * 86_400_000;

/** Полоска заполненности. */
function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <span className={cn("block h-2 overflow-hidden rounded-pill bg-lavender-soft", className)}>
      <span className="block h-full rounded-pill bg-primary" style={{ width: `${Math.max(pct, 2)}%` }} />
    </span>
  );
}

/** Кворум занятия: собираем, набран или подтверждён организатором. */
function QuorumChip({ o }: { o: OccurrenceResponse }) {
  if (!o.quorum || o.status === "CANCELLED") return null;
  if (o.quorum.status === "CONFIRMED") return <Chip tone="bg-primary text-primary-foreground">Подтверждено</Chip>;
  if (o.quorum.status === "REACHED") return <Chip tone="bg-secondary">Состоится</Chip>;
  return <Chip tone="bg-sky-soft">Кворум {o.quorum.count}/{o.quorum.required}</Chip>;
}

/** Строка пояснения под чипами. */
function note(o: OccurrenceResponse) {
  if (o.status === "CANCELLED") return `Причина: «${o.cancelReason ?? "не указана"}» · участники видят её у занятия`;
  const parts: string[] = [];
  if (o.rescheduled && o.originalStartAt) {
    const sameDay = dayShort(o.originalStartAt) === dayShort(o.startAt);
    parts.push(`Было ${sameDay ? hm(o.originalStartAt) : dayTime(o.originalStartAt)} → стало ${sameDay ? hm(o.startAt) : dayTime(o.startAt)}`);
  }
  if (o.source === "EXTRA") parts.push("Разовая дата вне расписания — правка правил её не трогает");
  if (o.confirmedAt) parts.push(`подтверждено ${dateShort(o.confirmedAt)}`);
  else if (o.quorum && o.quorum.status === "GATHERING") parts.push(`состоится, если наберётся ${o.quorum.required}`);
  return parts.join(" · ");
}

function OccurrenceRow({
  o,
  event,
  selected,
  onWho,
  onConfirm,
  onReschedule,
  onCancel,
}: {
  o: OccurrenceResponse;
  event: ManagedEvent;
  selected: boolean;
  onWho: () => void;
  onConfirm: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  const cancelled = o.status === "CANCELLED";
  const coming = event.recurring ? o.attendeesCount : event.participantsCount;
  const text = note(o);
  const v = o.viewer;
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-[18px] border-2 border-ink p-4",
        cancelled ? "bg-peach-soft" : "bg-card",
        selected && "border-[3px] border-primary",
      )}
    >
      <div className="flex items-center gap-3.5">
        <div className={cn("flex w-[88px] shrink-0 flex-col items-center gap-0.5 rounded-[12px] py-2", cancelled ? "bg-salmon" : "bg-lavender-soft")}>
          <span className={cn("text-[11px] font-extrabold tracking-[1px] uppercase", cancelled ? "text-foreground" : "text-primary")}>
            {dayShort(o.startAt)}
          </span>
          <span className={cn("font-display text-lg leading-[22px] font-extrabold text-foreground", cancelled && "line-through")}>{hm(o.startAt)}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          <div className="flex flex-wrap gap-2">
            <Chip>{SOURCE[o.source]}</Chip>
            {o.rescheduled && <Chip tone="bg-lime-soft">Перенесено</Chip>}
            {cancelled && <Chip tone="bg-salmon">Отменено</Chip>}
          </div>
          {text && <p className={cn("text-[13px] leading-[17px] font-bold", cancelled ? "text-orange-ink" : "text-muted-foreground")}>{text}</p>}
          {!cancelled && (
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-extrabold whitespace-nowrap text-foreground">
                Придут {coming}
                {o.capacity != null ? ` из ${o.capacity}` : ""}
              </span>
              {o.capacity != null && <Bar value={coming} max={o.capacity} className="w-[110px]" />}
            </div>
          )}
        </div>
        <div className="hidden sm:block">
          <QuorumChip o={o} />
        </div>
      </div>
      {!cancelled && (v.canConfirm || v.canReschedule || v.canCancel || coming > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {v.canConfirm && o.quorum?.status === "GATHERING" && (
            <Button variant="secondary" size="sm" onClick={onConfirm}>Подтвердить: состоится</Button>
          )}
          {v.canReschedule && (
            <Button variant="outline" size="sm" onClick={onReschedule}>
              <CalendarDays className="size-4" strokeWidth={2.4} />
              Перенести
            </Button>
          )}
          {v.canCancel && <OrangeButton onClick={onCancel}>Отменить</OrangeButton>}
          {coming > 0 && (
            <Button variant="soft" size="sm" className="bg-sky-soft" onClick={onWho} aria-pressed={selected}>
              Кто придёт · {coming}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

/** Боковая панель: кто отметился «приду» на занятие и как с кворумом. */
function WhoComes({ event, o, onClose }: { event: ManagedEvent; o: OccurrenceResponse; onClose: () => void }) {
  const q = useOccurrencesAttendees(event.id, o.id);
  const people = q.data?.status === 200 ? q.data.data : [];
  const coming = event.recurring ? o.attendeesCount : event.participantsCount;
  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 rounded-[24px] border-[3px] border-primary bg-card p-[18px] lg:sticky lg:top-6 lg:w-[316px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase">Кто придёт</span>
          <span className="text-base font-extrabold text-foreground">{dayTime(o.startAt)}</span>
        </div>
        <Button variant="outline" size="icon-sm" rough={false} className="size-[34px] shadow-none" onClick={onClose} aria-label="Закрыть">
          <X className="size-3.5" strokeWidth={3} />
        </Button>
      </div>
      <p className="text-[13px] leading-[17px] font-medium text-muted-foreground">
        {event.recurring ? "Отметились «приду»" : "Записались"}: {coming}
        {o.capacity != null ? ` из ${o.capacity}` : ""}. Список видят только организаторы.
      </p>
      {people.map((u) => (
        <div key={u.id} className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-ink bg-card px-2.5 py-2">
          <Avatar user={u} className="size-9" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-extrabold text-foreground">{fullName(u)}</span>
            <span className="truncate text-xs font-medium text-muted-foreground">@{u.username}{u.city ? ` · ${u.city}` : ""}</span>
          </div>
        </div>
      ))}
      {o.quorum && (
        <div className="flex flex-col gap-1.5 rounded-[14px] border-[1.5px] border-ink bg-sky-soft p-3">
          <span className="text-[11px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase">Кворум занятия</span>
          <span className="text-[15px] font-extrabold text-foreground">
            {o.quorum.count} из {o.quorum.required} · {o.quorum.status === "GATHERING" ? "собираем" : o.quorum.status === "REACHED" ? "состоится" : "подтверждено"}
          </span>
          <Bar value={o.quorum.count} max={o.quorum.required} />
          {o.quorum.status === "GATHERING" && (
            <span className="text-xs leading-4 font-medium text-muted-foreground">Можно подтвердить и не дожидаясь: подтверждение не снимается.</span>
          )}
        </div>
      )}
    </aside>
  );
}

/** Вкладка «Занятия»: расписание серии или единственное занятие разового мероприятия. */
export function OccurrencesTab({ event, refresh }: { event: ManagedEvent; refresh: () => Promise<unknown> }) {
  const list = useOccurrencesList(event.id);
  const all = list.data?.status === 200 ? [...list.data.data].sort((a, b) => a.startAt.localeCompare(b.startAt)) : [];
  const [period, setPeriod] = useState<"MONTH" | "ALL">("MONTH");
  const [limit, setLimit] = useState(STEP);
  const [whoId, setWhoId] = useState<string>();
  const [dialog, setDialog] = useState<{ kind: "confirm" | "reschedule" | "cancel"; o: OccurrenceResponse }>();
  const [adding, setAdding] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthEnd = Date.now() + MONTH_MS;
  const inPeriod =
    period === "ALL" || !event.recurring
      ? all
      : all.filter((o) => new Date(o.startAt) >= today && new Date(o.startAt).getTime() < monthEnd);
  const shown = inPeriod.slice(0, limit);
  const who = all.find((o) => o.id === whoId);

  const done = () => {
    setDialog(undefined);
    setAdding(false);
    void refresh();
  };
  const pick = (kind: "confirm" | "reschedule" | "cancel", o: OccurrenceResponse) => setDialog({ kind, o });

  return (
    <>
      {event.recurring && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PillTabs
            value={period}
            onChange={(p) => {
              setPeriod(p);
              setLimit(STEP);
            }}
            tabs={[
              { key: "MONTH", label: "Ближайшие 30 дней" },
              { key: "ALL", label: "Все", count: all.length },
            ]}
          />
          {event.viewer.canManage && event.status === "PUBLISHED" && (
            <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" strokeWidth={2.6} />
              Добавить разовую дату
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col items-start gap-5 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
          {list.isLoading ? (
            <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
          ) : shown.length === 0 ? (
            <p className="rounded-[18px] border-2 border-dashed border-track bg-card p-6 text-center text-base font-bold text-muted-foreground">
              {!event.recurring ? "Занятие уже прошло." : period === "MONTH" ? "В ближайшие 30 дней занятий нет." : "Будущих занятий нет."}
            </p>
          ) : (
            shown.map((o) => (
              <OccurrenceRow
                key={o.id}
                o={o}
                event={event}
                selected={o.id === whoId}
                onWho={() => setWhoId(o.id === whoId ? undefined : o.id)}
                onConfirm={() => pick("confirm", o)}
                onReschedule={() => pick("reschedule", o)}
                onCancel={() => pick("cancel", o)}
              />
            ))
          )}
          {inPeriod.length > limit && (
            <Button variant="outline" size="sm" className="self-center" onClick={() => setLimit((n) => n + STEP)}>
              Показать ещё {inPeriod.length - limit}
            </Button>
          )}
        </div>
        {who && <WhoComes event={event} o={who} onClose={() => setWhoId(undefined)} />}
      </div>

      <ConfirmDialog event={event} occurrence={dialog?.kind === "confirm" ? dialog.o : undefined} onClose={() => setDialog(undefined)} onDone={done} />
      <RescheduleDialog event={event} occurrence={dialog?.kind === "reschedule" ? dialog.o : undefined} onClose={() => setDialog(undefined)} onDone={done} />
      <CancelDialog event={event} occurrence={dialog?.kind === "cancel" ? dialog.o : undefined} onClose={() => setDialog(undefined)} onDone={done} />
      <AddDateDialog event={event} open={adding} onClose={() => setAdding(false)} onDone={done} />
    </>
  );
}
