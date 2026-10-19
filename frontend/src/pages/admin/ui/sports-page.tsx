import { useState } from "react";
import { Check, EyeOff, Flag, GitMerge, ImageOff, Plus, RotateCcw, Trash2, TriangleAlert, Upload, X } from "lucide-react";
import { cn } from "cn";
import {
  useAdminApproveSport,
  useAdminDeleteSport,
  useAdminHideSport,
  useAdminListSports,
  useAdminMergeSport,
  useAdminRestoreSport,
  useAdminSportCounts,
} from "@/shared/api/generated/core/admin/admin";
import type { AdminListSportsStatusItem, AdminSportResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { SPORT_STATUS } from "@/shared/lib/statuses";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { CabinetDialog, FieldLabel, textareaClass, Warning } from "@/pages/cabinet/ui/parts";
import { AdminLayout } from "./admin-layout";
import { Chip, Consequence, DecisionDialog, PageHead, Pager, PillTabs, SearchBox, Subject, useInvalidateAdmin } from "./parts";
import { SportFormDialog } from "./sport-form-dialog";
import { dateTime } from "./format";

const SIZE = 20;
type Tab = "ALL" | "ACTIVE" | "PENDING" | "HIDDEN";
const STATUSES: Record<Tab, AdminListSportsStatusItem[] | undefined> = {
  ALL: undefined,
  ACTIVE: ["ACTIVE"],
  PENDING: ["PENDING"],
  HIDDEN: ["HIDDEN", "MERGED"],
};
type Action = { kind: "form" | "hide" | "merge" | "delete"; sport?: AdminSportResponse };

const fullName = (u: { firstName?: string; lastName?: string; username?: string }) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "";

/** Картинка вида; без неё — пунктирная заглушка «PNG», как у обложки без фото. */
function Cover({ sport }: { sport: AdminSportResponse }) {
  if (sport.hasImage && sport.imageUrl) {
    return (
      <img src={sport.imageUrl} alt="" className="size-16 shrink-0 rounded-[14px] border-2 border-ink bg-sky object-cover"
        style={{ objectPosition: `${sport.imageFocus.x}% ${sport.imageFocus.y}%` }} />
    );
  }
  return (
    <span aria-label="Картинки нет" className="flex size-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[14px] border-2 border-dashed border-ink bg-background text-muted-foreground">
      <Upload className="size-[22px]" strokeWidth={2.4} />
      <span className="text-[10px] font-extrabold">PNG</span>
    </span>
  );
}

const orange = { color: "var(--orange)" };
const softOrange = "h-9 text-[13px] text-orange-ink";

function SportRow({ sport: s, onAction, onApprove, onRestore, busy }: {
  sport: AdminSportResponse;
  onAction: (a: Action) => void;
  onApprove: (s: AdminSportResponse) => void;
  onRestore: (s: AdminSportResponse) => void;
  busy: boolean;
}) {
  const status = SPORT_STATUS[s.status];
  const inactive = s.status === "HIDDEN" || s.status === "MERGED";
  const meta = [
    s.eventsCount ? `${s.eventsCount} мероприятий` : "мероприятий нет",
    `slug: ${s.slug}`,
    s.hasImage ? undefined : "картинки нет",
  ].filter(Boolean).join(" · ");
  return (
    <article className={cn("flex w-full flex-col gap-3 rounded-[24px] border-2 border-ink p-4 sm:p-[18px]", inactive ? "bg-background" : "bg-card")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Cover sport={s} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-base leading-5 font-extrabold text-foreground">{s.name}</h2>
            <Chip tone={s.custom ? "bg-mint-soft" : "bg-sky"} className="px-2 py-px text-[10px] normal-case">{s.custom ? "свой" : "справочник"}</Chip>
          </div>
          <p className="text-[13px] font-bold text-muted-foreground">{meta}</p>
          <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            {s.proposedBy ? (
              <>
                <UserAvatar user={s.proposedBy} className="size-[22px] shrink-0 rounded-full border-[1.5px] border-ink" />
                <span className="truncate">{fullName(s.proposedBy)} · предложил {dateTime(s.createdAt)}</span>
              </>
            ) : (
              <span>Добавлен в справочник · {dateTime(s.createdAt)}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <Chip tone={status.tone} className="text-[10px]">{status.label}</Chip>
          <div className="flex flex-wrap gap-2">
            {s.status === "PENDING" && (
              <>
                <Button variant="secondary" size="sm" className="h-9 text-[13px]" disabled={busy} onClick={() => onApprove(s)}>
                  <Check className="size-3.5" strokeWidth={3} />
                  Одобрить
                </Button>
                <Button variant="soft" size="sm" rough={orange} className={softOrange} onClick={() => onAction({ kind: "merge", sport: s })}>
                  <GitMerge className="size-3.5" strokeWidth={2.6} />
                  Объединить
                </Button>
                <Button variant="soft" size="sm" rough={orange} className={softOrange} onClick={() => onAction({ kind: "hide", sport: s })}>
                  <X className="size-3.5" strokeWidth={3} />
                  Отклонить
                </Button>
              </>
            )}
            {(s.status === "ACTIVE" || s.status === "PENDING") && (
              <Button variant={s.hasImage || s.status === "PENDING" ? "soft" : "secondary"} size="sm"
                rough={s.hasImage || s.status === "PENDING" ? orange : undefined}
                className={s.hasImage || s.status === "PENDING" ? softOrange : "h-9 text-[13px]"}
                onClick={() => onAction({ kind: "form", sport: s })}>
                <Upload className="size-3.5" strokeWidth={2.6} />
                {s.hasImage ? "Заменить PNG" : "Загрузить PNG"}
              </Button>
            )}
            {s.status === "ACTIVE" && (
              <Button variant="soft" size="sm" rough={orange} className={softOrange} onClick={() => onAction({ kind: "hide", sport: s })}>
                <EyeOff className="size-3.5" strokeWidth={2.6} />
                Скрыть
              </Button>
            )}
            {s.status === "HIDDEN" && (
              <Button variant="secondary" size="sm" className="h-9 text-[13px]" disabled={busy} onClick={() => onRestore(s)}>
                <RotateCcw className="size-3.5" strokeWidth={2.6} />
                Вернуть в справочник
              </Button>
            )}
            {s.status !== "MERGED" && s.status !== "PENDING" && (
              <Button variant="soft" size="sm" rough={orange} className={softOrange} onClick={() => onAction({ kind: "delete", sport: s })}>
                <Trash2 className="size-3.5" strokeWidth={2.6} />
                Удалить
              </Button>
            )}
          </div>
          {s.status === "MERGED" && <span className="text-xs font-medium text-muted-foreground">События перенесены в «{s.mergedIntoName}»</span>}
        </div>
      </div>
      {s.status === "PENDING" && (
        <p className="flex items-start gap-2 rounded-[12px] border-[1.5px] border-orange bg-peach px-3.5 py-2 text-[13px] font-bold text-foreground">
          <Flag className="mt-0.5 size-3.5 shrink-0 text-orange-ink" strokeWidth={2.6} />
          <span>Проверьте название и загрузите картинку: без PNG в ленте показывается заглушка. Возможно, это дубль — тогда объедините с существующим видом.</span>
        </p>
      )}
      {inactive && s.moderationReason && (
        <p className="flex items-start gap-2 rounded-[12px] border-[1.5px] border-orange bg-salmon px-3.5 py-2 text-[13px] font-bold text-foreground">
          <Flag className="mt-0.5 size-3.5 shrink-0 text-orange-ink" strokeWidth={2.6} />
          <span>Причина: «{s.moderationReason}»{s.moderatedAt ? ` · ${dateTime(s.moderatedAt)}` : ""}</span>
        </p>
      )}
    </article>
  );
}

/** Объединение дубля: выбрать вид, в который переносятся мероприятия и интересы. */
function MergeDialog({ sport, onClose }: { sport?: AdminSportResponse; onClose: () => void }) {
  const invalidate = useInvalidateAdmin();
  const merge = useAdminMergeSport();
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const list = useAdminListSports({ status: ["ACTIVE", "PENDING"], size: 100 }, { query: { enabled: !!sport } });
  const options = (list.data?.status === 200 ? list.data.data.items ?? [] : []).filter((x) => x.id !== sport?.id);
  const submit = () =>
    sport && merge.mutate({ id: sport.id, data: { targetId, reason: reason.trim() || undefined } }, { onSuccess: () => { onClose(); void invalidate(); } });
  return (
    <CabinetDialog open={!!sport} onOpenChange={(o) => !o && onClose()} title="Объединить с другим видом"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Назад</Button>
          <Button disabled={!targetId || merge.isPending} onClick={submit}>
            <GitMerge className="size-4" strokeWidth={2.6} />
            Объединить
          </Button>
        </>
      }>
      {sport && <Subject title={sport.name} text={`${sport.eventsCount} мероприятий · перейдут в выбранный вид`} />}
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="merge-target">Оставить вид</FieldLabel>
        <select id="merge-target" value={targetId} onChange={(e) => setTargetId(e.target.value)}
          className="h-12 w-full rounded-[12px] border-2 border-ink bg-card px-3.5 text-[15px] font-bold text-foreground outline-none focus-visible:border-primary">
          <option value="">Выберите вид</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      <ul className="flex flex-col gap-2">
        <Consequence>Мероприятия, интересы людей и анкеты организаций переедут в выбранный вид</Consequence>
        <Consequence>Этот вид получит статус «Объединён»; вернуть его нельзя</Consequence>
      </ul>
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="merge-reason">Причина (необязательно)</FieldLabel>
        <textarea id="merge-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Дубликат вида «Сёрфинг»" className={textareaClass} />
      </div>
      {merge.error?.detail && <Warning className="py-2">{merge.error.detail}</Warning>}
    </CabinetDialog>
  );
}

/** Решения над видом: скрыть с причиной, удалить, объединить. */
function SportDialogs({ action, onClose }: { action?: Action; onClose: () => void }) {
  const invalidate = useInvalidateAdmin();
  const hide = useAdminHideSport();
  const remove = useAdminDeleteSport();
  const done = { onSuccess: () => { onClose(); void invalidate(); } };
  const s = action?.sport;
  const subject = s && <Subject title={s.name} text={`${s.eventsCount} мероприятий · ${s.custom ? "свой вид" : "справочник"}`} />;
  const close = (o: boolean) => !o && onClose();
  return (
    <>
      <DecisionDialog open={action?.kind === "hide"} onOpenChange={close}
        title={s?.status === "PENDING" ? "Отклонить вид" : "Скрыть вид"} subject={subject}
        reasonLabel="Причина" reasonHint="Её увидят админы" placeholder="Не вид спорта"
        confirmLabel={s?.status === "PENDING" ? "Отклонить" : "Скрыть"} confirmClassName="bg-accent text-white"
        pending={hide.isPending} error={hide.error?.detail}
        onConfirm={(reason) => s && hide.mutate({ id: s.id, data: { reason } }, done)}>
        <ul className="flex flex-col gap-2">
          <Consequence>Пропадёт из справочника и формы создания мероприятия</Consequence>
          <Consequence>Уже созданные мероприятия останутся, их можно будет открыть</Consequence>
          <Consequence>Вернуть вид можно в любой момент</Consequence>
        </ul>
      </DecisionDialog>
      <DecisionDialog open={action?.kind === "delete"} onOpenChange={close} title="Удалить вид" subject={subject}
        confirmLabel="Удалить" confirmClassName="bg-accent text-white" confirmIcon={<Trash2 className="size-4" strokeWidth={2.6} />}
        pending={remove.isPending} error={remove.error?.detail}
        onConfirm={() => s && remove.mutate({ id: s.id }, done)}>
        <p className="flex items-start gap-2 rounded-[12px] border-[1.5px] border-orange bg-peach px-3.5 py-2.5 text-[13px] font-bold text-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-orange" strokeWidth={2.4} />
          Удаляется только вид, на который никто не ссылается. Если есть мероприятия или интересы, скройте вид или объедините его с другим.
        </p>
      </DecisionDialog>
      <MergeDialog sport={action?.kind === "merge" ? s : undefined} onClose={onClose} />
    </>
  );
}

/** Виды спорта: добавить вид с PNG, заменить картинку, одобрить или отклонить свой вид пользователя, объединить дубли. */
export default function AdminSportsPage() {
  const invalidate = useInvalidateAdmin();
  const [tab, setTab] = useState<Tab>("ALL");
  const [withoutImage, setWithoutImage] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(0);
  const [action, setAction] = useState<Action>();
  const [error, setError] = useState<string>();
  const list = useAdminListSports({ status: STATUSES[tab], withoutImage: withoutImage || undefined, searchText: searchText || undefined, page, size: SIZE });
  const counts = useAdminSportCounts();
  const approve = useAdminApproveSport();
  const restore = useAdminRestoreSport();
  const data = list.data?.status === 200 ? list.data.data : undefined;
  const items = data?.items ?? [];
  const c = counts.data?.status === 200 ? counts.data.data : undefined;
  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "ALL", label: "Все", count: c?.all ?? 0 },
    { key: "ACTIVE", label: "Справочник", count: c?.catalog ?? 0 },
    { key: "PENDING", label: "На модерации", count: c?.pending ?? 0 },
    { key: "HIDDEN", label: "Скрытые", count: c?.hidden ?? 0 },
  ];
  const decide = {
    onSuccess: () => { setError(undefined); void invalidate(); },
    onError: (e: { detail?: string }) => setError(e.detail ?? "Не удалось выполнить действие"),
  };

  return (
    <AdminLayout>
      <PageHead title="Виды спорта"
        text="Справочник видов: добавляйте новые с картинкой, меняйте PNG, одобряйте или объединяйте виды, которые предложили пользователи."
        aside={
          <Button onClick={() => setAction({ kind: "form" })}>
            <Plus className="size-[18px]" strokeWidth={2.6} />
            Добавить вид
          </Button>
        } />

      <div className="flex w-full flex-wrap items-center gap-3">
        <PillTabs tabs={tabs} value={tab} onChange={(k) => { setTab(k); setPage(0); }} />
        <button type="button" aria-pressed={withoutImage} onClick={() => { setWithoutImage((v) => !v); setPage(0); }}
          className={cn("flex h-11 items-center gap-2 rounded-pill border-2 border-dashed border-ink px-4 text-sm font-extrabold text-foreground", withoutImage ? "bg-secondary" : "bg-card")}>
          <ImageOff className="size-4" strokeWidth={2.4} />
          Без картинки{c ? ` · ${c.withoutImage}` : ""}
        </button>
        <SearchBox placeholder="Название вида" className="sm:ml-auto" onChange={(v) => { setSearchText(v); setPage(0); }} />
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        Свои виды создаются пользователями в форме мероприятия. Одобрите, добавьте картинку или объедините с существующим, чтобы не плодить дубли.
      </p>
      {error && <Warning>{error}</Warning>}

      {list.isPending ? (
        <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
      ) : list.isError ? (
        <p role="alert" className="text-base font-bold text-destructive">Не удалось загрузить виды спорта.</p>
      ) : items.length === 0 ? (
        <EmptyState icon={ImageOff} tone="bg-sky" title="Видов не нашлось" text="Попробуйте другую вкладку или название, либо добавьте новый вид." />
      ) : (
        <div className="flex w-full flex-col gap-4">
          {items.map((s) => (
            <SportRow key={s.id} sport={s} onAction={setAction} busy={approve.isPending || restore.isPending}
              onApprove={(x) => approve.mutate({ id: x.id }, decide)}
              onRestore={(x) => restore.mutate({ id: x.id }, decide)} />
          ))}
          <div className="rounded-[20px] border-2 border-ink bg-card">
            <Pager page={page} size={SIZE} total={data?.totalElements ?? 0} onPage={setPage} />
          </div>
        </div>
      )}

      <SportFormDialog open={action?.kind === "form"} sport={action?.kind === "form" ? action.sport : undefined}
        onClose={() => setAction(undefined)} onPick={(name) => { setSearchText(name); setTab("ALL"); setPage(0); }} />
      <SportDialogs action={action} onClose={() => setAction(undefined)} />
    </AdminLayout>
  );
}
