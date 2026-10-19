import { useEffect, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import {
  useOccurrencesAdd,
  useOccurrencesCancel,
  useOccurrencesConfirm,
  useOccurrencesReschedule,
} from "@/shared/api/generated/core/occurrences/occurrences";
import type { OccurrenceResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { toast } from "@/shared/lib/toast";
import { plural } from "@/pages/profile/model/use-profile";
import type { ManagedEvent } from "../model/use-manage-event";
import { dateShort, dayTime, fromInputs, hm, minutes, toDateInput, toTimeInput } from "../model/format";
import { CabinetDialog, FieldLabel, inputClass, textareaClass, Warning } from "./parts";

type Base = { event: ManagedEvent; onClose: () => void; onDone: () => void };

const people = (n: number) => `${n} ${plural(n, ["человек", "человека", "человек"])}`;

/** Дата, начало и необязательный конец. */
function DateTimeFields({
  value,
  onChange,
  dateLabel,
}: {
  value: { date: string; start: string; end: string };
  onChange: (v: { date: string; start: string; end: string }) => void;
  dateLabel: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.5fr_1fr_1fr]">
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="occ-date">{dateLabel}</FieldLabel>
        <input id="occ-date" type="date" required value={value.date} onChange={(e) => onChange({ ...value, date: e.target.value })} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="occ-start">Начало</FieldLabel>
        <input id="occ-start" type="time" required value={value.start} onChange={(e) => onChange({ ...value, start: e.target.value })} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="occ-end">Конец</FieldLabel>
        <input id="occ-end" type="time" value={value.end} onChange={(e) => onChange({ ...value, end: e.target.value })} className={inputClass} />
      </div>
    </div>
  );
}

/** Поля → тело запроса. Конец не позже начала (через полночь) не шлём — сервер сохранит прежнюю длительность. */
function toRequest(v: { date: string; start: string; end: string }) {
  const startAt = fromInputs(v.date, v.start);
  const endAt = v.end && v.end > v.start ? fromInputs(v.date, v.end) : undefined;
  return { startAt, endAt };
}

/** «Подтвердить: состоится» — для занятия с кворумом, даже если он не набран. */
export function ConfirmDialog({ event, occurrence, onClose, onDone }: Base & { occurrence?: OccurrenceResponse }) {
  const confirm = useOccurrencesConfirm();
  const q = occurrence?.quorum;
  return (
    <CabinetDialog
      open={Boolean(occurrence)}
      onOpenChange={(open) => !open && (confirm.reset(), onClose())}
      title="Подтвердить занятие"
      description="Занятие состоится независимо от кворума"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Назад</Button>
          <Button
            variant="secondary"
            disabled={confirm.isPending}
            onClick={() =>
              occurrence &&
              confirm.mutate(
                { id: event.id, occurrenceId: occurrence.id },
                { onSuccess: () => (toast.success("Занятие подтверждено"), onDone()) },
              )
            }
          >
            Подтвердить: состоится
          </Button>
        </>
      }
    >
      {occurrence && (
        <div className="flex flex-col gap-1.5 rounded-[14px] border-[1.5px] border-ink bg-sky-soft px-3.5 py-3">
          <p className="text-[11px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase">
            {dayTime(occurrence.startAt)}
            {q ? ` · кворум ${q.count} из ${q.required}` : ""}
          </p>
          <p className="text-sm leading-[19px] font-bold text-foreground">
            Занятие состоится, даже если {q ? `до ${q.required}` : "кворум"} не наберётся. Подтверждение нельзя снять, а отменить занятие можно — с причиной.
          </p>
        </div>
      )}
      {confirm.error?.detail && <Warning className="py-2">{confirm.error.detail}</Warning>}
    </CabinetDialog>
  );
}

/** Отмена занятия: причина обязательна, её увидят записавшиеся. */
export function CancelDialog({ event, occurrence, onClose, onDone }: Base & { occurrence?: OccurrenceResponse }) {
  const cancel = useOccurrencesCancel();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const empty = !reason.trim();
  const coming = occurrence ? (event.recurring ? occurrence.attendeesCount : event.participantsCount) : 0;

  const submit = () => {
    setTouched(true);
    if (!occurrence || empty) return;
    cancel.mutate(
      { id: event.id, occurrenceId: occurrence.id, data: { reason: reason.trim() } },
      { onSuccess: () => (toast.success("Занятие отменено"), setReason(""), setTouched(false), onDone()) },
    );
  };

  return (
    <CabinetDialog
      open={Boolean(occurrence)}
      onOpenChange={(open) => !open && (cancel.reset(), setTouched(false), onClose())}
      title="Отменить занятие"
      description="Отмена необратима, участники увидят причину"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Не отменять</Button>
          <Button variant="accent" className="text-white" onClick={submit} disabled={cancel.isPending}>Отменить занятие</Button>
        </>
      }
    >
      {occurrence && (
        <div className="flex items-center gap-2.5 rounded-[12px] bg-peach px-3 py-2.5">
          <CalendarDays className="size-[18px] shrink-0 text-orange" strokeWidth={2.4} />
          <p className="text-sm leading-[19px] font-bold text-foreground">
            {dayTime(occurrence.startAt)} · {event.title}.{" "}
            {coming > 0 ? `Придут ${people(coming)} — они увидят отмену и причину.` : "Пока никто не отметился."}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="cancel-reason">Причина отмены *</FieldLabel>
        <textarea
          id="cancel-reason"
          rows={2}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-invalid={touched && empty}
          placeholder="Например: зал закрыт на праздники"
          className={`${textareaClass} ${touched && empty ? "border-orange" : ""}`}
        />
        {touched && empty && <p className="text-xs font-bold text-orange-ink">Укажите причину — участники увидят её у занятия</p>}
      </div>
      {cancel.error?.detail && <Warning className="py-2">{cancel.error.detail}</Warning>}
    </CabinetDialog>
  );
}

/** Перенос: новая дата и время; без конца сохраняется прежняя длительность. */
export function RescheduleDialog({ event, occurrence, onClose, onDone }: Base & { occurrence?: OccurrenceResponse }) {
  const reschedule = useOccurrencesReschedule();
  const [value, setValue] = useState({ date: "", start: "", end: "" });
  useEffect(() => {
    if (occurrence)
      setValue({
        date: toDateInput(occurrence.startAt),
        start: toTimeInput(occurrence.startAt),
        end: occurrence.endAt ? toTimeInput(occurrence.endAt) : "",
      });
  }, [occurrence]);
  const duration = occurrence ? minutes(occurrence.startAt, occurrence.endAt) : undefined;

  return (
    <CabinetDialog
      open={Boolean(occurrence)}
      onOpenChange={(open) => !open && (reschedule.reset(), onClose())}
      title="Перенести занятие"
      description="Отметки участников сохранятся"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Назад</Button>
          <Button
            disabled={reschedule.isPending || !value.date || !value.start}
            onClick={() =>
              occurrence &&
              reschedule.mutate(
                { id: event.id, occurrenceId: occurrence.id, data: toRequest(value) },
                { onSuccess: () => (toast.success("Занятие перенесено"), onDone()) },
              )
            }
          >
            Перенести
          </Button>
        </>
      }
    >
      {occurrence && (
        <div className="flex items-center gap-2.5 rounded-[12px] bg-paper px-3 py-2.5">
          <Clock className="size-[18px] shrink-0 text-foreground" strokeWidth={2.4} />
          <p className="text-sm font-bold text-foreground">
            Сейчас: {dayTime(occurrence.startAt)}
            {occurrence.endAt ? `–${hm(occurrence.endAt)}` : ""}
            {duration ? ` (${duration} мин)` : ""}
          </p>
        </div>
      )}
      <DateTimeFields value={value} onChange={setValue} dateLabel="Новая дата" />
      <p className="text-[13px] font-medium text-muted-foreground">
        {duration ? `Не заполните конец — длительность ${duration} мин сохранится.` : "Конец можно не указывать."} Отметки «приду» останутся.
      </p>
      {reschedule.error?.detail && <Warning className="py-2">{reschedule.error.detail}</Warning>}
    </CabinetDialog>
  );
}

/** Разовая дата вне расписания серии. */
export function AddDateDialog({ event, open, onClose, onDone }: Base & { open: boolean }) {
  const add = useOccurrencesAdd();
  const [value, setValue] = useState({ date: "", start: "19:00", end: "" });
  useEffect(() => {
    if (open) setValue({ date: toDateInput(new Date(Date.now() + 86_400_000).toISOString()), start: "19:00", end: "" });
  }, [open]);

  return (
    <CabinetDialog
      open={open}
      onOpenChange={(o) => !o && (add.reset(), onClose())}
      title="Добавить разовую дату"
      description="Занятие вне расписания серии"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Назад</Button>
          <Button
            variant="secondary"
            disabled={add.isPending || !value.date || !value.start}
            onClick={() =>
              add.mutate({ id: event.id, data: toRequest(value) }, { onSuccess: () => (toast.success("Дата добавлена"), onDone()) })
            }
          >
            Добавить
          </Button>
        </>
      }
    >
      <DateTimeFields value={value} onChange={setValue} dateLabel="Дата" />
      <p className="text-[13px] leading-[18px] font-medium text-muted-foreground">
        Занятие вне расписания: правка правил серии его не затронет. Дата — в будущем и внутри периода серии
        {event.schedule ? ` (до ${dateShort(event.schedule.endDate)})` : ""}.
      </p>
      {add.error?.detail && <Warning className="py-2">{add.error.detail}</Warning>}
    </CabinetDialog>
  );
}
