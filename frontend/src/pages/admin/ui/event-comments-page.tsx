import { profilePath } from "@/entity/user/lib/profile-path";
import { Link, useParams } from "react-router";
import { ArrowUpRight, ChevronLeft, Trash2, MessagesSquare } from "lucide-react";
import { cn } from "cn";
import { useCommentsList } from "@/shared/api/generated/core/comments/comments";
import { useEventsGet } from "@/shared/api/generated/core/events/events";
import type { CommentResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { MODERATION_CATEGORY_LABEL } from "@/shared/lib/statuses";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { ago as relative } from "@/pages/cabinet/model/format";
import { AdminLayout } from "./admin-layout";
import { Chip, PageHead } from "./parts";
import { useCommentModeration, type CommentModeration } from "@/features/comment-moderation/model/use-comment-moderation";
import { CommentModerationAction, CommentModerationDialog } from "@/features/comment-moderation/ui/comment-moderation";

const shortName = (u: { firstName?: string; lastName?: string; username?: string }) =>
  [u.firstName, u.lastName?.[0] && `${u.lastName[0]}.`].filter(Boolean).join(" ") || u.username || "";

/** Сообщение потока: удаление с причиной или восстановление. */
function Message({ c, moderation }: { c: CommentResponse; moderation: CommentModeration }) {
  const flagged = c.moderation?.status === "FLAGGED" || c.moderation?.status === "AUTO_HIDDEN";
  const head = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] font-extrabold text-foreground">{shortName(c.author)}</span>
      {c.isOrganizer && <Chip tone="bg-secondary" className="px-2 py-px text-[9px]">организатор</Chip>}
      {c.organization && <span className="text-xs font-bold text-muted-foreground">{c.organization.name}</span>}
      <span className="text-xs font-medium text-muted-foreground">{relative(c.createdAt)}</span>
      {flagged && (
        <Link to="/admin/moderation" title={c.moderation?.explanation}>
          <Chip tone={c.moderation?.status === "AUTO_HIDDEN" ? "bg-salmon" : "bg-peach"} className="px-2 py-px text-[9px]">
            {c.moderation?.status === "AUTO_HIDDEN" ? "скрыто автоматически" : "проверить"}
            {c.moderation?.categories.length ? `: ${c.moderation.categories.map((k) => MODERATION_CATEGORY_LABEL[k].toLowerCase()).join(", ")}` : ""}
          </Chip>
        </Link>
      )}
    </div>
  );
  return (
    <div className="flex items-start gap-3">
      <UserAvatar user={c.author} className="size-9 shrink-0 rounded-full border-2 border-ink" />
      {c.hidden ? (
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-[16px] border-2 border-dashed border-orange bg-background px-3.5 py-3">
          {head}
          <p className="text-[15px] font-bold text-muted-foreground">Удалено администратором</p>
          {c.text && <p className="text-[13px] font-medium text-muted-foreground whitespace-pre-wrap break-words">{c.text}</p>}
          <p className="flex items-start gap-2 rounded-[10px] bg-peach px-3 py-2 text-xs font-bold text-foreground">
            <Trash2 className="mt-px size-3.5 shrink-0 text-orange-ink" strokeWidth={2.6} />
            Причина: «{c.hiddenReason}» · видят автор и админы
          </p>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-[16px] border-2 border-ink bg-card px-3.5 py-3">
          {head}
          {c.replyTo && (
            <p className="truncate rounded-[8px] bg-lavender-soft px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {shortName(c.replyTo.author)}: {c.replyTo.deleted ? "сообщение удалено" : c.replyTo.hidden ? "Удалено администратором" : c.replyTo.text}
            </p>
          )}
          <p className={cn("text-[15px] leading-[21px] font-bold whitespace-pre-line", c.deleted ? "text-muted-foreground" : "text-foreground")}>
            {c.deleted ? "Сообщение удалено автором" : c.text}
          </p>
        </div>
      )}
      <div className="flex shrink-0 flex-col items-start gap-2">
        <CommentModerationAction comment={c} moderation={moderation} />
        <Button asChild variant="ghost" size="icon-sm">
          <Link to={profilePath(c.author)} aria-label="Открыть автора"><ArrowUpRight className="size-4" /></Link>
        </Button>
      </div>
    </div>
  );
}

/** Обсуждение мероприятия глазами модератора: удалить сообщение с причиной или вернуть. */
export default function AdminEventCommentsPage() {
  const { id = "" } = useParams();
  const event = useEventsGet(id);
  const title = event.data?.status === 200 ? event.data.data.title : undefined;
  const list = useCommentsList(id, undefined, { query: { refetchInterval: 15_000 } });
  const comments = list.data?.status === 200 ? list.data.data : [];
  const moderation = useCommentModeration(id);

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
      <PageHead title="Обсуждение: модерация" text="Админ видит все сообщения и может удалить любое с причиной. Мероприятие и остальной чат остаются." />

      <div className="flex w-full flex-col items-start gap-5 lg:flex-row">
        <section className="flex w-full min-w-0 flex-1 flex-col gap-3.5 rounded-[24px] border-2 border-ink bg-card p-4 sm:p-6">
          {list.isPending ? (
            <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
          ) : comments.length === 0 ? (
            <EmptyState size="sm" icon={MessagesSquare} tone="bg-sky" title="Сообщений нет" text="В обсуждении этого мероприятия пока никто не писал." />
          ) : (
            comments.map((c) => (
              <Message key={c.id} c={c} moderation={moderation} />
            ))
          )}
        </section>

        <aside className="flex w-full flex-col gap-4 lg:w-[316px] lg:shrink-0">
          <section className="flex flex-col gap-2.5 rounded-[24px] border-2 border-ink bg-card p-5">
            <h2 className="font-display text-lg font-extrabold text-foreground">Как это видят</h2>
            {[
              ["Участники", "Удалено администратором. Текста и причины нет."],
              ["Автор сообщения", "Видит причину удаления, ответить на удалённое или изменить его нельзя."],
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

      <CommentModerationDialog moderation={moderation} />
    </AdminLayout>
  );
}
