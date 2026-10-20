import { profilePath } from "@/entity/user/lib/profile-path";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowUpRight, ChevronLeft, EyeOff, MessagesSquare, MoreHorizontal, RotateCcw } from "lucide-react";
import { cn } from "cn";
import { useAdminHideComment, useAdminUnhideComment } from "@/shared/api/generated/core/admin/admin";
import { useCommentsList } from "@/shared/api/generated/core/comments/comments";
import { useEventsGet } from "@/shared/api/generated/core/events/events";
import type { CommentResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { ago as relative } from "@/pages/cabinet/model/format";
import { AdminLayout } from "./admin-layout";
import { Chip, DecisionDialog, PageHead, Warning, useInvalidateAdmin } from "./parts";

const shortName = (u: { firstName?: string; lastName?: string; username?: string }) =>
  [u.firstName, u.lastName?.[0] && `${u.lastName[0]}.`].filter(Boolean).join(" ") || u.username || "";

/** Сообщение потока: меню «…» со скрытием, у скрытого — причина и «Вернуть». */
function Message({ c, onHide, onUnhide, unhiding }: { c: CommentResponse; onHide: () => void; onUnhide: () => void; unhiding: boolean }) {
  const [menu, setMenu] = useState(false);
  const head = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] font-extrabold text-foreground">{shortName(c.author)}</span>
      {c.isOrganizer && <Chip tone="bg-secondary" className="px-2 py-px text-[9px]">организатор</Chip>}
      {c.organization && <span className="text-xs font-bold text-muted-foreground">{c.organization.name}</span>}
      <span className="text-xs font-medium text-muted-foreground">{relative(c.createdAt)}</span>
    </div>
  );
  return (
    <div className="flex items-start gap-3">
      <UserAvatar user={c.author} className="size-9 shrink-0 rounded-full border-2 border-ink" />
      {c.hidden ? (
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-[16px] border-2 border-dashed border-orange bg-background px-3.5 py-3">
          {head}
          <p className="text-[15px] font-bold text-muted-foreground">Сообщение скрыто модератором</p>
          {c.text && <p className="text-[13px] font-medium text-muted-foreground line-through">{c.text}</p>}
          <p className="flex items-start gap-2 rounded-[10px] bg-peach px-3 py-2 text-xs font-bold text-foreground">
            <EyeOff className="mt-px size-3.5 shrink-0 text-orange-ink" strokeWidth={2.6} />
            Причина: «{c.hiddenReason}» · видят автор и админы
          </p>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-[16px] border-2 border-ink bg-card px-3.5 py-3">
          {head}
          {c.replyTo && (
            <p className="truncate rounded-[8px] bg-lavender-soft px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {shortName(c.replyTo.author)}: {c.replyTo.deleted ? "сообщение удалено" : c.replyTo.hidden ? "сообщение скрыто" : c.replyTo.text}
            </p>
          )}
          <p className={cn("text-[15px] leading-[21px] font-bold whitespace-pre-line", c.deleted ? "text-muted-foreground" : "text-foreground")}>
            {c.deleted ? "Сообщение удалено автором" : c.text}
          </p>
        </div>
      )}
      <div className="relative w-[112px] shrink-0">
        {c.hidden ? (
          <Button variant="secondary" size="sm" className="h-9 text-[13px]" disabled={unhiding} onClick={onUnhide}>
            <RotateCcw className="size-3.5" strokeWidth={2.6} />
            Вернуть
          </Button>
        ) : !c.deleted && (
          <>
            <button type="button" aria-label="Действия с сообщением" aria-expanded={menu} onClick={() => setMenu((m) => !m)}
              className={cn("flex size-8 items-center justify-center rounded-full border-2 transition-colors",
                menu ? "border-ink bg-ink text-white" : "border-track bg-card text-muted-foreground hover:border-ink")}>
              <MoreHorizontal className="size-4" strokeWidth={2.6} />
            </button>
            {menu && (
              <div className="absolute top-10 right-0 z-20 flex w-[200px] flex-col gap-0.5 rounded-[16px] border-2 border-ink bg-card p-1.5 shadow-hard-sm"
                onMouseLeave={() => setMenu(false)}>
                <button type="button" onClick={() => { setMenu(false); onHide(); }}
                  className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-left text-sm font-extrabold text-orange-ink hover:bg-peach">
                  <EyeOff className="size-4" strokeWidth={2.4} />
                  Скрыть сообщение…
                </button>
                <Link to={profilePath(c.author)} className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-extrabold text-foreground hover:bg-muted">
                  <ArrowUpRight className="size-4" strokeWidth={2.4} />
                  Открыть автора
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Обсуждение мероприятия глазами модератора: скрыть сообщение с причиной или вернуть. */
export default function AdminEventCommentsPage() {
  const { id = "" } = useParams();
  const event = useEventsGet(id);
  const title = event.data?.status === 200 ? event.data.data.title : undefined;
  const list = useCommentsList(id, undefined, { query: { refetchInterval: 15_000 } });
  const comments = list.data?.status === 200 ? list.data.data : [];
  const [hiding, setHiding] = useState<CommentResponse>();
  const hide = useAdminHideComment();
  const unhide = useAdminUnhideComment();
  const invalidate = useInvalidateAdmin();

  return (
    <AdminLayout>
      <nav className="flex min-w-0 flex-wrap items-center gap-2 text-[13px]">
        <Link to="/admin/events" className="flex items-center gap-1 font-extrabold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5" strokeWidth={2.6} />
          Мероприятия
        </Link>
        <span className="font-medium text-muted-foreground">/</span>
        <Link to={`/events/${id}`} className="truncate font-extrabold text-muted-foreground hover:text-foreground">{title ?? "…"}</Link>
        <span className="font-medium text-muted-foreground">/</span>
        <span className="font-extrabold text-foreground">Обсуждение</span>
      </nav>
      <PageHead title="Обсуждение: модерация" text="Админ видит все сообщения и может скрыть любое с причиной. Мероприятие и остальной чат остаются." />

      {unhide.error?.detail && <Warning>{unhide.error.detail}</Warning>}

      <div className="flex w-full flex-col items-start gap-5 lg:flex-row">
        <section className="flex w-full min-w-0 flex-1 flex-col gap-3.5 rounded-[24px] border-2 border-ink bg-card p-4 sm:p-6">
          {list.isPending ? (
            <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
          ) : comments.length === 0 ? (
            <EmptyState size="sm" icon={MessagesSquare} tone="bg-sky" title="Сообщений нет" text="В обсуждении этого мероприятия пока никто не писал." />
          ) : (
            comments.map((c) => (
              <Message key={c.id} c={c} onHide={() => setHiding(c)} unhiding={unhide.isPending}
                onUnhide={() => unhide.mutate({ id: c.id }, { onSuccess: () => void invalidate() })} />
            ))
          )}
        </section>

        <aside className="flex w-full flex-col gap-4 lg:w-[316px] lg:shrink-0">
          <section className="flex flex-col gap-2.5 rounded-[24px] border-2 border-ink bg-card p-5">
            <h2 className="font-display text-lg font-extrabold text-foreground">Как это видят</h2>
            {[
              ["Участники", "Сообщение скрыто модератором. Текста и причины нет."],
              ["Автор сообщения", "Видит причину скрытия, ответить на скрытое или изменить его нельзя."],
              ["Админ", "Видит текст, причину и кнопку «Вернуть»."],
            ].map(([who, what]) => (
              <div key={who} className="flex flex-col gap-1 rounded-[14px] bg-background px-3 py-2.5">
                <span className="text-[13px] font-extrabold text-foreground">{who}</span>
                <span className="text-xs leading-4 font-medium text-muted-foreground">{what}</span>
              </div>
            ))}
          </section>
        </aside>
      </div>

      <DecisionDialog open={!!hiding} onOpenChange={(o) => !o && setHiding(undefined)} title="Скрыть сообщение"
        subject={hiding && (
          <div className="flex flex-col gap-1 rounded-[14px] bg-background px-3.5 py-3">
            <span className="text-xs font-bold text-muted-foreground">{shortName(hiding.author)} · {relative(hiding.createdAt)}</span>
            <span className="line-clamp-3 text-sm font-extrabold text-foreground">{hiding.text}</span>
          </div>
        )}
        reasonLabel="Причина" reasonHint="Её увидят автор и администраторы" placeholder="Оскорбления участников"
        confirmLabel="Скрыть сообщение" confirmClassName="bg-accent text-white" confirmIcon={<EyeOff className="size-4" strokeWidth={2.6} />}
        pending={hide.isPending} error={hide.error?.detail}
        onConfirm={(reason) => hiding && hide.mutate({ id: hiding.id, data: { reason } }, { onSuccess: () => { setHiding(undefined); void invalidate(); } })}>
        <p className="text-[13px] font-medium text-foreground">
          Остальной чат и мероприятие останутся. Все увидят «Сообщение скрыто модератором», автор — причину. Ответить на скрытое и исправить его нельзя.
        </p>
      </DecisionDialog>
    </AdminLayout>
  );
}
