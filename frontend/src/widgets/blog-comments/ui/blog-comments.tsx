import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CornerDownRight, Send, X } from "lucide-react";
import { cn } from "cn";
import {
  getBlogCommentsQueryKey,
  useBlogAddComment,
  useBlogComments,
  useBlogDeleteComment,
  useBlogUpdateComment,
} from "@/shared/api/generated/core/blog/blog";
import type { BlogCommentResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { Disc } from "@/shared/components/ui/disc";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { toast } from "@/shared/lib/toast";
import { ENTER_HINT, enterToSend } from "@/shared/lib/enter-to-send";
import { MessageCircle } from "lucide-react";
import { ago, authorHref, authorName } from "@/entity/blog/lib/post";
import { useUser } from "@/entity/user/model/use-user";

const MAX = 2000;

function Composer({ onSend, busy, replyTo, onCancelReply, autoFocus }: {
  onSend(text: string): Promise<unknown>;
  busy: boolean;
  /** Ответ на этот комментарий: форма стоит прямо под ним. */
  replyTo?: BlogCommentResponse | null;
  onCancelReply?(): void;
  autoFocus?: boolean;
}) {
  const { user } = useUser();
  const [text, setText] = useState("");
  const send = async () => {
    if (!text.trim()) return;
    try {
      await onSend(text.trim());
      setText("");
    } catch {
      // ошибку уже показал onError мутации, текст оставляем — можно поправить и отправить снова
    }
  };
  return (
    <div className="flex flex-col gap-2">
      {replyTo && (
        <div className="flex items-center gap-2 rounded-[12px] bg-muted px-3 py-2 text-[13px] font-semibold text-muted-foreground">
          <CornerDownRight className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Ответ для {authorName(replyTo.author, replyTo.organization)}</span>
          <button type="button" onClick={onCancelReply} aria-label="Не отвечать" className="rounded-full p-1 hover:bg-card"><X className="size-4" /></button>
        </div>
      )}
      <div className="box-border flex items-end gap-3 rounded-[18px] border-2 border-ink bg-background p-2.5">
        <Disc initials="" user={user ?? undefined} tone="bg-sky" className="hidden size-9 sm:flex" textClassName="text-xs" />
        <textarea
          value={text}
          autoFocus={autoFocus}
          maxLength={MAX}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && replyTo) onCancelReply?.();
            else enterToSend(e, setText, () => void send());
          }}
          placeholder={replyTo ? "Твой ответ…" : "Напиши комментарий или задай вопрос автору…"}
          title={ENTER_HINT}
          aria-label="Комментарий"
          className="field-sizing-content max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-[22px] font-medium outline-none placeholder:text-muted-foreground"
        />
        <Button size="icon-sm" onClick={() => void send()} disabled={busy || !text.trim()} aria-label="Отправить">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function CommentItem({ comment, nested, onReply, onEdit, onDelete, replyBox }: {
  comment: BlogCommentResponse;
  /** Ответ внутри ветки — со сдвигом вправо. */
  nested: boolean;
  onReply(): void;
  onEdit(text: string): Promise<unknown>;
  onDelete(): void;
  /** Форма ответа на этот комментарий — сразу под ним. */
  replyBox?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text ?? "");
  const name = authorName(comment.author, comment.organization);
  return (
    <div className={cn("flex flex-col gap-2", nested && "pl-6 sm:pl-12")}>
    <div className="flex gap-3">
      <Link to={authorHref(comment.author, comment.organization)} className="shrink-0" aria-label={name}>
        <Disc initials="" user={comment.author} tone={comment.organization ? "bg-secondary" : "bg-sky"} className="size-9" textClassName="text-xs" />
      </Link>
      <div className={cn("box-border flex min-w-0 flex-1 flex-col gap-1.5 rounded-[16px] border-2 border-ink px-4 py-3",
        comment.isPostAuthor ? "bg-lime-soft" : "bg-card")}>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={authorHref(comment.author, comment.organization)} className="text-sm font-extrabold text-foreground hover:underline">{name}</Link>
          {comment.isPostAuthor && (
            <span className="box-border inline-flex h-[22px] items-center rounded-pill border-[1.5px] border-ink bg-secondary px-2 text-[10px] font-extrabold tracking-[0.6px] uppercase">
              Автор
            </span>
          )}
          <span className="text-xs font-semibold text-muted-foreground">· {ago(comment.createdAt)}{comment.editedAt ? " · изменено" : ""}</span>
        </div>
        {comment.replyTo && (
          <p className="truncate rounded-[10px] bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            ↳ {authorName(comment.replyTo.author)}: {comment.replyTo.deleted ? "комментарий удалён" : `«${comment.replyTo.text}»`}
          </p>
        )}
        {comment.deleted ? (
          <p className="text-sm font-semibold text-muted-foreground italic">Комментарий удалён</p>
        ) : editing ? (
          <div className="flex flex-col gap-2">
            <textarea value={draft} maxLength={MAX} onChange={(e) => setDraft(e.target.value)} aria-label="Исправить комментарий"
              onKeyDown={(e) => enterToSend(e, setDraft, () => { if (draft.trim()) void onEdit(draft.trim()).then(() => setEditing(false)); })}
              className="field-sizing-content min-h-16 resize-none rounded-[10px] border-2 border-ink bg-background px-3 py-2 text-[15px] outline-none" />
            <div className="flex gap-2">
              <Button size="sm" disabled={!draft.trim()} onClick={() => void onEdit(draft.trim()).then(() => setEditing(false))}>Сохранить</Button>
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); setDraft(comment.text ?? ""); }}>Отмена</Button>
            </div>
          </div>
        ) : (
          <p className="text-[15px] leading-[22px] font-medium break-words whitespace-pre-line text-foreground">{comment.text}</p>
        )}
        {!comment.deleted && !editing && (
          <div className="flex gap-4 text-xs font-bold">
            <button type="button" onClick={onReply} className="text-primary hover:underline">Ответить</button>
            {comment.canEdit && <button type="button" onClick={() => setEditing(true)} className="text-muted-foreground hover:underline">Изменить</button>}
            {comment.canEdit && <button type="button" onClick={onDelete} className="text-muted-foreground hover:underline">Удалить</button>}
          </div>
        )}
      </div>
    </div>
    {replyBox && <div className="pl-12">{replyBox}</div>}
    </div>
  );
}

/**
 * Ветки: комментарии в общем потоке по времени, под каждым — все ответы на него и на ответы к нему (по времени).
 * Так ответ стоит рядом с тем, на что отвечает, а не теряется в конце ленты.
 */
function threads(comments: BlogCommentResponse[]) {
  const byId = new Map(comments.map((c) => [c.id, c]));
  const rootOf = (c: BlogCommentResponse): string => {
    let cur = c;
    const seen = new Set<string>();
    while (cur.replyTo && byId.has(cur.replyTo.id) && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = byId.get(cur.replyTo.id)!;
    }
    return cur.id;
  };
  const replies = new Map<string, BlogCommentResponse[]>();
  const roots: BlogCommentResponse[] = [];
  for (const c of comments) {
    const root = rootOf(c);
    if (root === c.id) roots.push(c);
    else replies.set(root, [...(replies.get(root) ?? []), c]);
  }
  return roots.flatMap((r) => [{ comment: r, nested: false }, ...(replies.get(r.id) ?? []).map((c) => ({ comment: c, nested: true }))]);
}

/** Комментарии под постом: по порядку, ответ с цитатой, правка и удаление своего. Метка «Автор» — у автора поста. */
export function BlogComments({ postId, canComment, blockedReason }: { postId: string; canComment: boolean; blockedReason?: string | null }) {
  const queryClient = useQueryClient();
  const query = useBlogComments(postId, { query: { refetchInterval: 20_000 } });
  const comments = query.data?.status === 200 ? query.data.data : [];
  const [replyTo, setReplyTo] = useState<BlogCommentResponse | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getBlogCommentsQueryKey(postId) });
    void queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/blog/posts") });
  };
  const fail = (error: { detail?: string }) => toast.error(error.detail ?? "Не получилось. Попробуй ещё раз.");
  const add = useBlogAddComment({ mutation: { onSuccess: () => { setReplyTo(null); refresh(); }, onError: fail } });
  const update = useBlogUpdateComment({ mutation: { onSuccess: refresh, onError: fail } });
  const remove = useBlogDeleteComment({ mutation: { onSuccess: refresh, onError: fail } });
  const visible = comments.filter((c) => !c.deleted).length;

  return (
    <section aria-labelledby="blog-comments" className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <h2 id="blog-comments" className="font-display text-2xl leading-8 font-bold text-foreground">Комментарии</h2>
        <span className="box-border inline-flex h-[26px] min-w-[26px] items-center justify-center rounded-pill border-[1.5px] border-ink bg-secondary px-2 text-xs font-extrabold">{visible}</span>
      </div>
      {canComment ? (
        <Composer busy={add.isPending && !replyTo} onSend={(text) => add.mutateAsync({ id: postId, data: { text } })} />
      ) : (
        <p className="rounded-[16px] border-2 border-dashed border-ink/40 px-4 py-3 text-sm font-semibold text-muted-foreground">
          {blockedReason ?? "Комментарии закрыты"}
        </p>
      )}
      {query.isSuccess && comments.length === 0 && (
        <EmptyState size="sm" icon={MessageCircle} tone="bg-sky" title="Пока без комментариев" text="Задай вопрос автору или просто скажи спасибо." />
      )}
      <div className="flex flex-col gap-3">
        {threads(comments).map(({ comment: c, nested }) => (
          <CommentItem key={c.id} comment={c} nested={nested}
            onReply={() => setReplyTo(replyTo?.id === c.id ? null : c)}
            onEdit={(text) => update.mutateAsync({ id: postId, commentId: c.id, data: { text } })}
            onDelete={() => remove.mutate({ id: postId, commentId: c.id })}
            replyBox={canComment && replyTo?.id === c.id ? (
              <Composer key={c.id} busy={add.isPending} replyTo={c} autoFocus onCancelReply={() => setReplyTo(null)}
                onSend={(text) => add.mutateAsync({ id: postId, data: { text, replyToId: c.id } })} />
            ) : undefined} />
        ))}
      </div>
    </section>
  );
}
