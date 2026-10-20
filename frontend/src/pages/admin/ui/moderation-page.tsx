import { useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, Bot, Check, Eraser, EyeOff, RefreshCw, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "cn";
import {
  useAdminApproveModeration,
  useAdminClearProfileText,
  useAdminHideModeration,
  useAdminListModeration,
  useAdminRecheckModeration,
  useAdminUnhideComment,
} from "@/shared/api/generated/core/admin/admin";
import type {
  AdminListModerationStatus,
  AdminListModerationTargetType,
  ModerationItemResponse,
} from "@/shared/api/generated/core/appAPI.schemas";
import {
  MODERATION_CATEGORY_LABEL,
  MODERATION_DECISION_LABEL,
  MODERATION_STATUS,
  MODERATION_TARGET_LABEL,
} from "@/shared/lib/statuses";
import { profilePath } from "@/entity/user/lib/profile-path";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { AdminLayout } from "./admin-layout";
import { Chip, Consequence, DecisionDialog, PageHead, Pager, PillTabs, Subject, Warning, useInvalidateAdmin } from "./parts";
import { dateTime } from "./format";

const SIZE = 20;
type Tab = "QUEUE" | AdminListModerationStatus;
type Kind = "ALL" | AdminListModerationTargetType;
type Action = { kind: "hide" | "clear"; item: ModerationItemResponse };

const TABS: { key: Tab; label: string }[] = [
  { key: "QUEUE", label: "Ждут решения" },
  { key: "AUTO_HIDDEN", label: "Скрыто автоматически" },
  { key: "PENDING", label: "Ждут нейросеть" },
  { key: "RESOLVED", label: "Решённые" },
];
const KINDS: { key: Kind; label: string }[] = [
  { key: "ALL", label: "Все" },
  { key: "COMMENT", label: "Сообщения" },
  { key: "EVENT", label: "Мероприятия" },
  { key: "USER_PROFILE", label: "Профили" },
  { key: "ORGANIZATION", label: "Организации" },
];
const SEVERITY = ["нет", "лёгкое", "заметное", "грубое"];

const fullName = (u: { firstName?: string; lastName?: string; username?: string }) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "";

/** Куда вести с карточки: обсуждение, мероприятие, профиль или анкета. */
function sourceLink(m: ModerationItemResponse): { to: string; label: string } | undefined {
  switch (m.targetType) {
    case "COMMENT":
      return m.eventId ? { to: `/admin/events/${m.eventId}/comments`, label: "Обсуждение" } : undefined;
    case "EVENT":
      return m.eventId ? { to: `/events/${m.eventId}`, label: "Мероприятие" } : undefined;
    case "USER_PROFILE":
      return m.author ? { to: profilePath(m.author), label: "Профиль" } : undefined;
    case "ORGANIZATION":
      return { to: `/admin/organizations/${m.targetId}`, label: "Анкета" };
  }
}

/** Причина скрытия по умолчанию — из найденных нарушений. */
const defaultReason = (m: ModerationItemResponse) =>
  m.categories.map((c) => MODERATION_CATEGORY_LABEL[c]).join(", ") || "Нарушение правил обсуждения";

function ModerationCard({ m, onAction, onApprove, onRestore, onRecheck, busy }: {
  m: ModerationItemResponse;
  onAction: (a: Action) => void;
  onApprove: (m: ModerationItemResponse) => void;
  onRestore: (m: ModerationItemResponse) => void;
  onRecheck: (m: ModerationItemResponse) => void;
  busy: boolean;
}) {
  const status = MODERATION_STATUS[m.status];
  const link = sourceLink(m);
  const open = m.status !== "RESOLVED";
  // «Ошибка, вернуть» уже есть у автоскрытого в очереди; любое другое скрытое сообщение возвращаем здесь
  const restorable = m.targetType === "COMMENT" && m.hidden && !(open && m.status === "AUTO_HIDDEN");
  return (
    <article className={cn("flex w-full flex-col gap-3 rounded-[24px] border-2 border-ink p-4 sm:p-[18px]",
      m.status === "AUTO_HIDDEN" ? "bg-background" : "bg-card")}>
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="bg-sky" className="px-2 py-px text-[10px]">{MODERATION_TARGET_LABEL[m.targetType]}</Chip>
        <Chip tone={status.tone} className="px-2 py-px text-[10px]">{status.label}</Chip>
        {m.source && (
          <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
            {m.source === "LLM" ? <Bot className="size-3.5" strokeWidth={2.4} /> : <Sparkles className="size-3.5" strokeWidth={2.4} />}
            {m.source === "LLM" ? "нейросеть" : "словарь"}
          </span>
        )}
        <span className="text-xs font-medium text-muted-foreground">{dateTime(m.updatedAt)}</span>
        {link && (
          <Link to={link.to} className="ml-auto flex items-center gap-1 text-[13px] font-extrabold text-ultramarine hover:underline">
            {link.label}{m.targetTitle && m.targetType !== "USER_PROFILE" ? `: ${m.targetTitle}` : ""}
            <ArrowUpRight className="size-3.5" strokeWidth={2.6} />
          </Link>
        )}
      </div>

      {m.author && (
        <div className="flex items-center gap-2 text-[13px] font-bold text-foreground">
          <UserAvatar user={m.author} className="size-[26px] shrink-0 rounded-full border-[1.5px] border-ink" />
          <Link to={profilePath(m.author)} className="truncate hover:underline">{fullName(m.author)}</Link>
          <span className="font-medium text-muted-foreground">@{m.author.username}</span>
        </div>
      )}

      {m.hidden && <p className="-mb-2 text-xs font-bold text-muted-foreground">Оригинал скрытого сообщения — участники видят заглушку</p>}
      <p className={cn("rounded-[14px] border-2 border-ink px-3.5 py-3 text-[15px] leading-[21px] font-bold whitespace-pre-line break-words text-foreground",
        m.hidden ? "border-dashed bg-background" : "bg-background")}>
        {m.text}
      </p>

      {(m.categories.length > 0 || m.explanation) && (
        <div className="flex flex-col gap-2 rounded-[12px] border-[1.5px] border-orange bg-peach px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <ShieldAlert className="size-4 shrink-0 text-orange-ink" strokeWidth={2.4} />
            {m.categories.map((c) => (
              <Chip key={c} tone="bg-card" className="px-2 py-px text-[10px]">{MODERATION_CATEGORY_LABEL[c]}</Chip>
            ))}
            {m.severity > 0 && <span className="text-xs font-extrabold text-foreground">серьёзность: {SEVERITY[m.severity]}</span>}
          </div>
          {m.explanation && <p className="text-[13px] font-semibold text-foreground">{m.explanation}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {open && (
          <Button variant="secondary" size="sm" className="h-9 text-[13px]" disabled={busy} onClick={() => onApprove(m)}>
            <Check className="size-3.5" strokeWidth={3} />
            {m.status === "AUTO_HIDDEN" ? "Ошибка, вернуть" : "Всё в порядке"}
          </Button>
        )}
        {restorable && (
          <Button variant="secondary" size="sm" className="h-9 text-[13px]" disabled={busy} onClick={() => onRestore(m)}>
            <RotateCcw className="size-3.5" strokeWidth={2.6} />
            Вернуть
          </Button>
        )}
        {m.targetType === "COMMENT" && !m.hidden && (
          <Button variant="soft" size="sm" rough={{ color: "var(--orange)" }} className="h-9 text-[13px] text-orange-ink"
            onClick={() => onAction({ kind: "hide", item: m })}>
            <EyeOff className="size-3.5" strokeWidth={2.6} />
            Скрыть
          </Button>
        )}
        {m.targetType === "USER_PROFILE" && open && (
          <Button variant="soft" size="sm" rough={{ color: "var(--orange)" }} className="h-9 text-[13px] text-orange-ink"
            onClick={() => onAction({ kind: "clear", item: m })}>
            <Eraser className="size-3.5" strokeWidth={2.6} />
            Очистить «О себе»
          </Button>
        )}
        {m.targetType === "EVENT" && open && (
          <Button asChild variant="outline" size="sm" className="h-9 text-[13px] shadow-none">
            <Link to="/admin/events">Снять с публикации…</Link>
          </Button>
        )}
        {m.targetType === "ORGANIZATION" && open && (
          <Button asChild variant="outline" size="sm" className="h-9 text-[13px] shadow-none">
            <Link to={`/admin/organizations/${m.targetId}`}>Вернуть на доработку…</Link>
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-9 text-[13px] shadow-none" disabled={busy} onClick={() => onRecheck(m)}>
          <RefreshCw className="size-3.5" strokeWidth={2.6} />
          Проверить ещё раз
        </Button>
        {m.decision && (
          <span className="text-xs font-bold text-muted-foreground">
            Решение: {MODERATION_DECISION_LABEL[m.decision]}{m.reviewedAt ? ` · ${dateTime(m.reviewedAt)}` : ""}
          </span>
        )}
      </div>
    </article>
  );
}

/** Скрыть сообщение с причиной и очистить «О себе». */
function ModerationDialogs({ action, onClose }: { action?: Action; onClose: () => void }) {
  const invalidate = useInvalidateAdmin();
  const hide = useAdminHideModeration();
  const clear = useAdminClearProfileText();
  const done = { onSuccess: () => { onClose(); void invalidate(); } };
  const m = action?.item;
  const subject = m && <Subject title={m.author ? fullName(m.author) : "Автор неизвестен"} text={m.text} />;
  const close = (o: boolean) => !o && onClose();
  return (
    <>
      <DecisionDialog open={action?.kind === "hide"} onOpenChange={close} title="Скрыть сообщение" subject={subject}
        reasonLabel="Причина" reasonHint="Её увидят автор и администраторы" placeholder={m ? defaultReason(m) : undefined}
        confirmLabel="Скрыть" confirmClassName="bg-accent text-white" confirmIcon={<EyeOff className="size-4" strokeWidth={2.6} />}
        pending={hide.isPending} error={hide.error?.detail}
        onConfirm={(reason) => m && hide.mutate({ id: m.id, data: { reason } }, done)}>
        <ul className="flex flex-col gap-2">
          <Consequence>Вместо текста все увидят «Сообщение скрыто модератором»</Consequence>
          <Consequence>Автор получит уведомление с причиной</Consequence>
          <Consequence>Вернуть можно здесь или прямо в обсуждении</Consequence>
        </ul>
      </DecisionDialog>
      <DecisionDialog open={action?.kind === "clear"} onOpenChange={close} title="Очистить «О себе»" subject={subject}
        confirmLabel="Очистить" confirmClassName="bg-accent text-white" confirmIcon={<Eraser className="size-4" strokeWidth={2.6} />}
        pending={clear.isPending} error={clear.error?.detail}
        onConfirm={() => m && clear.mutate({ id: m.id }, done)}>
        <ul className="flex flex-col gap-2">
          <Consequence>Текст «О себе» в профиле сотрётся</Consequence>
          <Consequence>Имя, фото и остальной профиль останутся</Consequence>
        </ul>
      </DecisionDialog>
    </>
  );
}

/** Постмодерация: что словарь и нейросеть сочли сомнительным, и решения по этому. */
export default function AdminModerationPage() {
  const invalidate = useInvalidateAdmin();
  const [tab, setTab] = useState<Tab>("QUEUE");
  const [kind, setKind] = useState<Kind>("ALL");
  const [page, setPage] = useState(0);
  const [action, setAction] = useState<Action>();
  const [error, setError] = useState<string>();
  const list = useAdminListModeration({
    status: tab === "QUEUE" ? undefined : tab,
    targetType: kind === "ALL" ? undefined : kind,
    page,
    size: SIZE,
  });
  const approve = useAdminApproveModeration();
  const recheck = useAdminRecheckModeration();
  const unhide = useAdminUnhideComment();
  const data = list.data?.status === 200 ? list.data.data : undefined;
  const items = data?.items ?? [];
  const decide = {
    onSuccess: () => { setError(undefined); void invalidate(); },
    onError: (e: { detail?: string }) => setError(e.detail ?? "Не удалось выполнить действие"),
  };

  return (
    <AdminLayout>
      <PageHead title="Модерация"
        text="Мат не даёт сохранить словарь. Остальное проверяет нейросеть уже после публикации: сомнительное попадает сюда, явные угрозы и травлю в обсуждениях она скрывает сама — проверьте и верните, если ошиблась." />

      <div className="flex w-full flex-wrap items-center gap-3">
        <PillTabs tabs={TABS} value={tab} onChange={(k) => { setTab(k); setPage(0); }} />
        <PillTabs tabs={KINDS} value={kind} onChange={(k) => { setKind(k); setPage(0); }} />
      </div>
      {error && <Warning>{error}</Warning>}

      {list.isPending ? (
        <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
      ) : list.isError ? (
        <p role="alert" className="text-base font-bold text-destructive">Не удалось загрузить очередь модерации.</p>
      ) : items.length === 0 ? (
        <EmptyState icon={ShieldAlert} tone="bg-lime-soft" title="Здесь пусто"
          text={tab === "QUEUE" ? "Сомнительных текстов нет — всё спокойно." : "Попробуйте другую вкладку."} />
      ) : (
        <div className="flex w-full flex-col gap-4">
          {items.map((m) => (
            <ModerationCard key={m.id} m={m} onAction={setAction} busy={approve.isPending || recheck.isPending || unhide.isPending}
              onApprove={(x) => approve.mutate({ id: x.id }, decide)}
              onRestore={(x) => unhide.mutate({ id: x.targetId }, decide)}
              onRecheck={(x) => recheck.mutate({ id: x.id }, decide)} />
          ))}
          <div className="rounded-[20px] border-2 border-ink bg-card">
            <Pager page={page} size={SIZE} total={data?.totalElements ?? 0} onPage={setPage} />
          </div>
        </div>
      )}

      <ModerationDialogs action={action} onClose={() => setAction(undefined)} />
    </AdminLayout>
  );
}
