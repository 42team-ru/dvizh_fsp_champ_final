import { Inbox, UsersRound } from "lucide-react";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { useState } from "react";
import {
  useRegistrationsApprove,
  useRegistrationsListForEvent,
  useRegistrationsReject,
} from "@/shared/api/generated/core/registrations/registrations";
import type { EventRegistrationResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { PARTICIPANT_STATUS } from "@/shared/lib/statuses";
import { Button } from "@/shared/components/ui/button";
import { toast } from "@/shared/lib/toast";
import { fullName } from "@/pages/event/model/use-event";
import type { ManagedEvent } from "../model/use-manage-event";
import { ago, dateShort } from "../model/format";
import { Avatar, CabinetDialog, Chip, Divider, FieldLabel, OrangeButton, PersonLine, PillTabs, textareaClass, Warning } from "./parts";
import { handle } from "@/shared/lib/handle";

type Filter = "PENDING" | "CONFIRMED" | "WAITLISTED" | "REJECTED" | "CANCELLED";
const REASON_MAX = 300;

/** Подпись под заявкой: когда подана или чем закончилась. */
function when(r: EventRegistrationResponse, byRequest: boolean) {
  switch (r.status) {
    case "CONFIRMED":
      return byRequest && r.decidedAt ? `Принята ${dateShort(r.decidedAt)}` : `Записался ${dateShort(r.createdAt)}`;
    case "REJECTED":
      return r.decidedAt ? `Отклонена ${dateShort(r.decidedAt)}` : "Отклонена";
    case "CANCELLED":
      return r.decidedAt ? `Отменил запись ${dateShort(r.decidedAt)}` : "Отменил запись";
    case "WAITLISTED":
      return `В листе ожидания с ${dateShort(r.queuedAt ?? r.createdAt)}`;
    default:
      return `Подана ${ago(r.createdAt)}`;
  }
}

function RegistrationRow({
  r,
  byRequest,
  busy,
  error,
  onApprove,
  onReject,
}: {
  r: EventRegistrationResponse;
  byRequest: boolean;
  busy: boolean;
  error?: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const status = PARTICIPANT_STATUS[r.status];
  return (
    <article className={`flex flex-col gap-2.5 rounded-[18px] border-2 border-ink px-4 py-3.5 ${r.status === "CANCELLED" ? "bg-paper" : "bg-card"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <Avatar user={r.participant} />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
            <PersonLine user={r.participant} />
            {r.message && (
              <p className="max-w-[480px] rounded-[12px] bg-lime-soft px-3 py-[7px] text-sm leading-[19px] font-bold text-foreground">«{r.message}»</p>
            )}
            {r.status === "REJECTED" && r.decisionReason && (
              <p className="text-[13px] font-bold text-orange-ink">Причина отказа: «{r.decisionReason}»</p>
            )}
            <p className="text-[13px] font-medium text-muted-foreground">{when(r, byRequest)}</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Chip tone={status.tone}>{status.label}</Chip>
          <div className="flex flex-wrap gap-2">
            {(r.status === "PENDING" || r.status === "WAITLISTED") && (
              <>
                <Button variant="secondary" size="sm" onClick={onApprove} disabled={busy}>Принять</Button>
                <OrangeButton onClick={onReject} disabled={busy}>Отклонить</OrangeButton>
              </>
            )}
            {r.status === "REJECTED" && (
              <Button variant="outline" size="sm" onClick={onApprove} disabled={busy}>Принять всё же</Button>
            )}
            {r.status === "CONFIRMED" && <OrangeButton onClick={onReject} disabled={busy}>Исключить</OrangeButton>}
          </div>
        </div>
      </div>
      {error && <Warning className="py-2">{error}</Warning>}
    </article>
  );
}

/** Отказ или исключение: причина необязательна, участник увидит её у себя. */
function RejectDialog({
  target,
  eventTitle,
  onClose,
  onDone,
}: {
  target?: EventRegistrationResponse;
  eventTitle: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const reject = useRegistrationsReject();
  const excluding = target?.status === "CONFIRMED";
  const title = excluding ? "Исключить участника" : "Отклонить заявку";

  const submit = () => {
    if (!target) return;
    reject.mutate(
      { id: target.id, data: { reason: reason.trim() || undefined } },
      {
        onSuccess: () => {
          toast.success(excluding ? "Участник исключён" : "Заявка отклонена");
          setReason("");
          onDone();
        },
      },
    );
  };

  return (
    <CabinetDialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) {
          reject.reset();
          onClose();
        }
      }}
      title={title}
      description="Причину увидит участник"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Назад</Button>
          <Button variant="accent" className="text-white" onClick={submit} disabled={reject.isPending}>{title}</Button>
        </>
      }
    >
      {target && (
        <div className="flex items-center gap-2.5 rounded-[12px] bg-paper px-3 py-2.5">
          <Avatar user={target.participant} className="size-9" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-extrabold text-foreground">
              {fullName(target.participant)} · {handle(target.participant.username)}
            </span>
            <span className="truncate text-[13px] font-medium text-muted-foreground">
              {eventTitle}
              {target.message ? ` · «${target.message}»` : ""}
            </span>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="reject-reason">Причина (необязательно)</FieldLabel>
        <textarea
          id="reject-reason"
          rows={3}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Например: группа уже набрана, загляните на следующую неделю"
          className={textareaClass}
        />
        <p className="text-xs font-medium text-muted-foreground">
          Участник увидит причину у себя в записях. Можно оставить пустой. {reason.length} / {REASON_MAX}
        </p>
      </div>
      {reject.error?.detail && <Warning className="py-2">{reject.error.detail}</Warning>}
    </CabinetDialog>
  );
}

/** Вкладка «Заявки»: ждут решения сверху, ниже — недавние решения. */
export function RequestsTab({ event, refresh }: { event: ManagedEvent; refresh: () => Promise<unknown> }) {
  const list = useRegistrationsListForEvent(event.id);
  const all = list.data?.status === 200 ? list.data.data : [];
  const approve = useRegistrationsApprove();
  const [rejecting, setRejecting] = useState<EventRegistrationResponse>();
  const [failed, setFailed] = useState<{ id: string; detail?: string }>();

  const count = (s: Filter) => all.filter((r) => r.status === s).length;
  const pending = count("PENDING");
  const [filter, setFilter] = useState<Filter>(event.joinMode === "REQUEST" ? "PENDING" : "CONFIRMED");
  const shown = all.filter((r) => r.status === filter);
  /** Три последних решения под заявками: быстро поправить ошибку. */
  const recent = all
    .filter((r) => r.status !== "PENDING" && r.decidedAt)
    .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""))
    .slice(0, 3);
  const free = event.capacity != null ? Math.max(0, event.capacity - event.participantsCount) : undefined;

  const doApprove = (r: EventRegistrationResponse) =>
    approve.mutate(
      { id: r.id },
      {
        onSuccess: () => {
          setFailed(undefined);
          toast.success(`${fullName(r.participant)} — участник`);
          void refresh();
        },
        onError: (e) => setFailed({ id: r.id, detail: e.detail }),
      },
    );

  const tabs = [
    { key: "PENDING" as const, label: "Ждут", count: pending },
    { key: "CONFIRMED" as const, label: "Приняты", count: count("CONFIRMED") },
    ...(count("WAITLISTED") ? [{ key: "WAITLISTED" as const, label: "В очереди", count: count("WAITLISTED") }] : []),
    { key: "REJECTED" as const, label: "Отклонены", count: count("REJECTED") },
    { key: "CANCELLED" as const, label: "Отменили", count: count("CANCELLED") },
  ];

  return (
    <>
      {!event.recurring && free != null && pending > free && (
        <Warning>
          Свободно {free} из {event.capacity}, а заявок {pending}. Лишние придётся отклонить.
        </Warning>
      )}

      <PillTabs tabs={tabs} value={filter} onChange={setFilter} className="self-start" />

      {list.isLoading ? (
        <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
      ) : shown.length === 0 ? (
        filter === "PENDING" ? (
          <EmptyState icon={Inbox} tone="bg-mint" title="Новых заявок нет" text="Когда кто-то попросится на встречу, заявка появится здесь." />
        ) : (
          <EmptyState icon={UsersRound} tone="bg-secondary" title="Здесь пока никого" text="Поделитесь ссылкой на мероприятие — участники подтянутся." />
        )
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((r) => (
            <RegistrationRow
              key={r.id}
              r={r}
              byRequest={event.joinMode === "REQUEST"}
              busy={approve.isPending}
              error={failed?.id === r.id ? failed.detail : undefined}
              onApprove={() => doApprove(r)}
              onReject={() => setRejecting(r)}
            />
          ))}
        </div>
      )}

      {filter === "PENDING" && recent.length > 0 && (
        <>
          <Divider>Недавние решения</Divider>
          <div className="flex flex-col gap-3">
            {recent.map((r) => (
              <RegistrationRow
                key={r.id}
                r={r}
                byRequest={event.joinMode === "REQUEST"}
                busy={approve.isPending}
                error={failed?.id === r.id ? failed.detail : undefined}
                onApprove={() => doApprove(r)}
                onReject={() => setRejecting(r)}
              />
            ))}
          </div>
        </>
      )}

      <p className="text-[13px] leading-[18px] font-medium text-muted-foreground">
        Принять можно и ранее отклонённую заявку — так исправляется ошибка.
        {event.recurring && " Принятые участники серии сами отмечаются «приду» на каждое занятие."}
      </p>

      <RejectDialog
        target={rejecting}
        eventTitle={event.title}
        onClose={() => setRejecting(undefined)}
        onDone={() => {
          setRejecting(undefined);
          void refresh();
        }}
      />
    </>
  );
}
