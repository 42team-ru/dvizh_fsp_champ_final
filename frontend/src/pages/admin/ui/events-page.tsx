import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CalendarSearch, EyeOff, Flag, MessagesSquare, RotateCcw, Trash2, TriangleAlert, X } from "lucide-react";
import { cn } from "cn";
import {
  useAdminDeleteEvent,
  useAdminGetOrganization,
  useAdminListEvents,
  useAdminRestoreEvent,
  useAdminUnpublishEvent,
} from "@/shared/api/generated/core/admin/admin";
import { useUsersGet } from "@/shared/api/generated/core/users/users";
import type { AdminEventResponse, AdminListEventsStatus } from "@/shared/api/generated/core/appAPI.schemas";
import { EVENT_STATUS } from "@/shared/lib/statuses";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { dayTime } from "@/pages/cabinet/model/format";
import { AdminLayout } from "./admin-layout";
import { Chip, Consequence, DecisionDialog, PageHead, Pager, PillTabs, SearchBox, Subject, toneOf, useInvalidateAdmin } from "./parts";
import { dateTime } from "./format";

const SIZE = 20;
type Filter = "ALL" | AdminListEventsStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "Все" },
  { key: "PUBLISHED", label: "Опубликованные" },
  { key: "UNPUBLISHED", label: "Снятые" },
  { key: "DELETED", label: "Удалённые" },
];
export type Action = { kind: "unpublish" | "restore" | "delete"; event: AdminEventResponse };

const fullName = (u: { firstName?: string; lastName?: string; username?: string }) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "";

/** Счётчик на вкладке статуса с учётом выбранной организации или автора. */
function useCount(status: AdminListEventsStatus | undefined, organizationId?: string, authorId?: string) {
  const q = useAdminListEvents({ status, organizationId, authorId, size: 1 });
  return q.data?.status === 200 ? q.data.data.totalElements ?? 0 : 0;
}

/** Фильтр из ссылки (организация или автор): чип с крестиком. */
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="flex h-11 items-center gap-2 rounded-pill border-2 border-dashed border-ink bg-card pr-2 pl-4 text-sm font-extrabold text-foreground">
      {label}
      <button type="button" aria-label={`Сбросить фильтр «${label}»`} onClick={onClear} className="flex size-7 items-center justify-center rounded-full hover:bg-muted">
        <X className="size-3.5" strokeWidth={3} />
      </button>
    </span>
  );
}

function EventRow({ event: e, onAction }: { event: AdminEventResponse; onAction: (a: Action) => void }) {
  const status = EVENT_STATUS[e.status];
  const deleted = e.status === "DELETED";
  return (
    <article className={cn("flex w-full flex-col gap-3 rounded-[24px] border-2 border-ink p-4 sm:p-[18px]", deleted ? "bg-background" : "bg-card")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <img src={e.sport.imageUrl} alt="" className="size-16 shrink-0 rounded-[14px] border-2 border-ink bg-sky object-cover" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/events/${e.id}`} className="font-display text-base leading-5 font-extrabold text-foreground hover:underline">{e.title}</Link>
            <Chip tone={toneOf(e.sport.name)} className="px-2 py-px text-[10px] normal-case">{e.sport.name}</Chip>
          </div>
          <p className="text-[13px] font-bold text-muted-foreground">
            {dayTime(e.startAt)}{e.address ? ` · ${e.address}` : " · онлайн"}
          </p>
          <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <UserAvatar user={e.author} className="size-[22px] shrink-0 rounded-full border-[1.5px] border-ink" />
            <Link to={`/admin/events?authorId=${e.author.id}`} className="truncate hover:underline">
              {fullName(e.author)} · {e.organizationId ? "от организации" : "частное лицо"}
            </Link>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-extrabold text-foreground">{e.participantsCount} уч.</span>
            <Chip tone={status.tone} className="text-[10px]">{status.label}</Chip>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="ghost" size="sm" className="h-9 px-3 text-[13px]">
              <Link to={`/admin/events/${e.id}/comments`}>
                <MessagesSquare className="size-3.5" strokeWidth={2.6} />
                Обсуждение
              </Link>
            </Button>
            {e.status === "PUBLISHED" && (
              <Button variant="soft" size="sm" rough={{ color: "var(--orange)" }} className="h-9 text-[13px] text-orange-ink" onClick={() => onAction({ kind: "unpublish", event: e })}>
                <EyeOff className="size-3.5" strokeWidth={2.6} />
                Снять
              </Button>
            )}
            {e.status === "UNPUBLISHED" && (
              <Button variant="secondary" size="sm" className="h-9 text-[13px]" onClick={() => onAction({ kind: "restore", event: e })}>
                <RotateCcw className="size-3.5" strokeWidth={2.6} />
                Вернуть в публикацию
              </Button>
            )}
            {!deleted && (
              <Button variant="soft" size="sm" rough={{ color: "var(--orange)" }} className="h-9 text-[13px] text-orange-ink" onClick={() => onAction({ kind: "delete", event: e })}>
                <Trash2 className="size-3.5" strokeWidth={2.6} />
                Удалить
              </Button>
            )}
          </div>
          {deleted && <span className="text-xs font-medium text-muted-foreground">Открывается по ссылке с плашкой «Удалено»</span>}
        </div>
      </div>
      {e.moderationReason && (
        <p className={cn("flex items-start gap-2 rounded-[12px] border-[1.5px] border-orange px-3.5 py-2 text-[13px] font-bold text-foreground", deleted ? "bg-salmon" : "bg-peach")}>
          <Flag className="mt-0.5 size-3.5 shrink-0 text-orange-ink" strokeWidth={2.6} />
          <span>Причина: «{e.moderationReason}»{e.moderatedAt ? ` · ${dateTime(e.moderatedAt)}` : ""}</span>
        </p>
      )}
    </article>
  );
}

/** Диалоги модерации: снять, вернуть или удалить мероприятие. */
export function ModerationDialogs({ action, onClose }: { action?: Action; onClose: () => void }) {
  const invalidate = useInvalidateAdmin();
  const unpublish = useAdminUnpublishEvent();
  const restore = useAdminRestoreEvent();
  const remove = useAdminDeleteEvent();
  const done = { onSuccess: () => { onClose(); void invalidate(); } };
  const e = action?.event;
  const subject = e && (
    <Subject media={<UserAvatar user={e.author} className="size-9 shrink-0 rounded-full border-2 border-ink" />}
      title={e.title}
      text={e.moderationReason && action?.kind === "restore" ? `Снято: «${e.moderationReason}»` : `${fullName(e.author)} · ${e.participantsCount} уч.`} />
  );
  const close = (o: boolean) => !o && onClose();
  return (
    <>
      <DecisionDialog open={action?.kind === "unpublish"} onOpenChange={close} title="Снять с публикации" subject={subject}
        reasonLabel="Причина" reasonHint="Её увидят записавшиеся и организатор" placeholder="Реклама сторонних услуг"
        confirmLabel="Снять с публикации" confirmClassName="bg-accent text-white"
        pending={unpublish.isPending} error={unpublish.error?.detail}
        onConfirm={(reason) => e && unpublish.mutate({ id: e.id, data: { reason } }, done)}>
        <ul className="flex flex-col gap-2">
          <Consequence>Пропадёт из ленты и с карты</Consequence>
          <Consequence>Запись закроется</Consequence>
          <Consequence>Записавшиеся и организатор увидят статус и причину</Consequence>
        </ul>
      </DecisionDialog>
      <DecisionDialog open={action?.kind === "restore"} onOpenChange={close} title="Вернуть в публикацию" subject={subject}
        confirmLabel="Вернуть в публикацию" confirmClassName="bg-secondary text-secondary-foreground"
        confirmIcon={<RotateCcw className="size-4" strokeWidth={2.6} />}
        pending={restore.isPending} error={restore.error?.detail}
        onConfirm={() => e && restore.mutate({ id: e.id }, done)}>
        <ul className="flex flex-col gap-2">
          <Consequence>Снова в ленте и на карте</Consequence>
          <Consequence>Запись откроется</Consequence>
          <Consequence>Участники получат уведомление</Consequence>
        </ul>
      </DecisionDialog>
      <DecisionDialog open={action?.kind === "delete"} onOpenChange={close} title="Удалить мероприятие" subject={subject}
        reasonLabel="Причина" reasonHint="Её увидят записавшиеся и организатор" placeholder="Дубликат мероприятия"
        confirmLabel="Удалить" confirmClassName="bg-accent text-white" confirmIcon={<Trash2 className="size-4" strokeWidth={2.6} />}
        pending={remove.isPending} error={remove.error?.detail}
        onConfirm={(reason) => e && remove.mutate({ id: e.id, data: { reason } }, done)}>
        <p className="flex items-start gap-2 rounded-[12px] border-[1.5px] border-orange bg-peach px-3.5 py-2.5 text-[13px] font-bold text-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-orange" strokeWidth={2.4} />
          Мягкое удаление: по прямой ссылке откроется плашка «Удалено» с причиной. Вернуть в публикацию такое мероприятие нельзя.
        </p>
      </DecisionDialog>
    </>
  );
}

/** Мероприятия: поиск и модерация — снять с публикации, вернуть или удалить с причиной. */
export default function AdminEventsPage() {
  const [params, setParams] = useSearchParams();
  const filter = (params.get("status") as Filter | null) ?? "ALL";
  const organizationId = params.get("organizationId") ?? undefined;
  const authorId = params.get("authorId") ?? undefined;
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(0);
  const [action, setAction] = useState<Action>();
  const status = filter === "ALL" ? undefined : filter;
  const list = useAdminListEvents({ status, organizationId, authorId, searchText: searchText || undefined, page, size: SIZE });
  const data = list.data?.status === 200 ? list.data.data : undefined;
  const items = data?.items ?? [];

  const org = useAdminGetOrganization(organizationId ?? "", { query: { enabled: !!organizationId } });
  const author = useUsersGet(authorId ?? "", { query: { enabled: !!authorId } });
  const orgName = org.data?.status === 200 ? org.data.data.name : undefined;
  const authorName = author.data?.status === 200 ? fullName(author.data.data) : undefined;

  const counts: Record<Filter, number> = {
    ALL: useCount(undefined, organizationId, authorId),
    PUBLISHED: useCount("PUBLISHED", organizationId, authorId),
    UNPUBLISHED: useCount("UNPUBLISHED", organizationId, authorId),
    DELETED: useCount("DELETED", organizationId, authorId),
  };

  const update = (patch: Record<string, string | undefined>) => {
    setPage(0);
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  return (
    <AdminLayout>
      <PageHead title="Мероприятия" text="Модерация: снять с публикации, вернуть или удалить. Причину увидят организатор и записавшиеся." />

      <div className="flex w-full flex-wrap items-center gap-3">
        <PillTabs tabs={FILTERS.map((f) => ({ ...f, count: counts[f.key] }))} value={filter}
          onChange={(k) => update({ status: k === "ALL" ? undefined : k })} />
        {organizationId && <FilterChip label={orgName ?? "Организация"} onClear={() => update({ organizationId: undefined })} />}
        {authorId && <FilterChip label={authorName ?? "Автор"} onClear={() => update({ authorId: undefined })} />}
        <SearchBox placeholder="Название" className="sm:ml-auto" onChange={(v) => { setSearchText(v); setPage(0); }} />
      </div>

      {list.isPending ? (
        <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
      ) : list.isError ? (
        <p role="alert" className="text-base font-bold text-destructive">Не удалось загрузить мероприятия.</p>
      ) : items.length === 0 ? (
        <EmptyState icon={CalendarSearch} tone="bg-sky" title="Мероприятий не нашлось" text="Попробуйте другой статус, название или сбросьте фильтр." />
      ) : (
        <div className="flex w-full flex-col gap-4">
          {items.map((e) => <EventRow key={e.id} event={e} onAction={setAction} />)}
          <div className="rounded-[20px] border-2 border-ink bg-card">
            <Pager page={page} size={SIZE} total={data?.totalElements ?? 0} onPage={setPage} />
          </div>
        </div>
      )}

      <ModerationDialogs action={action} onClose={() => setAction(undefined)} />
    </AdminLayout>
  );
}
