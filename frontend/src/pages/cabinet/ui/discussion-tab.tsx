import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { getCommentsListQueryKey, useCommentsCreate, useCommentsList } from "@/shared/api/generated/core/comments/comments";
import type { CommentResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { fullName } from "@/pages/event/model/use-event";
import type { ManagedEvent } from "../model/use-manage-event";
import { ago } from "../model/format";
import { Avatar, Chip, Warning } from "./parts";

/** «Ольга К.» — коротко в пузыре. */
const shortName = (u: CommentResponse["author"]) => (u.lastName ? `${u.firstName} ${u.lastName[0]}.` : fullName(u));

function Message({ c, onReply }: { c: CommentResponse; onReply?: () => void }) {
  const mine = c.isMine;
  const body = c.deleted ? "Сообщение удалено" : c.hidden ? "Скрыто администратором" : c.text;
  return (
    <div className={cn("flex items-start gap-2.5", mine && "flex-row-reverse")}>
      <Avatar user={c.author} className="size-[34px]" />
      <div
        className={cn(
          "flex max-w-[min(560px,100%)] flex-col gap-1 rounded-[16px] border-[1.5px] border-ink px-3.5 py-2.5",
          mine ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-extrabold">{mine ? fullName(c.author) : shortName(c.author)}</span>
          {c.isOrganizer && <Chip tone="bg-secondary" className="px-[7px] text-[10px]">Организатор</Chip>}
          <span className={cn("text-xs font-medium", mine ? "text-lilac" : "text-muted-foreground")}>
            {ago(c.createdAt)}
            {c.editedAt && " · изменено"}
          </span>
        </div>
        {c.replyTo && (
          <p className={cn("rounded-[8px] px-2 py-1 text-xs font-medium", mine ? "bg-white/15" : "bg-paper text-muted-foreground")}>
            {shortName(c.replyTo.author)}: {c.replyTo.deleted ? "сообщение удалено" : c.replyTo.text}
          </p>
        )}
        <p className={cn("text-[15px] leading-[21px] font-bold whitespace-pre-line", (c.deleted || c.hidden) && "font-medium italic opacity-70")}>{body}</p>
        {onReply && !c.deleted && !c.hidden && !mine && (
          <button type="button" onClick={onReply} className="self-start text-xs font-bold text-muted-foreground underline">
            Ответить
          </button>
        )}
      </div>
    </div>
  );
}

/** Обсуждение в кабинете: тот же поток, что на карточке мероприятия, ответы — от организатора. */
export function DiscussionTab({ event }: { event: ManagedEvent }) {
  const queryClient = useQueryClient();
  const list = useCommentsList(event.id, undefined, { query: { refetchInterval: 15_000 } });
  const comments = list.data?.status === 200 ? list.data.data : [];
  const create = useCommentsCreate();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentResponse>();

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    create.mutate(
      { id: event.id, data: { text: text.trim(), replyToId: replyTo?.id } },
      {
        onSuccess: () => {
          setText("");
          setReplyTo(undefined);
          void queryClient.invalidateQueries({ queryKey: getCommentsListQueryKey(event.id) });
        },
      },
    );
  };

  return (
    <section className="flex w-full flex-col gap-3 rounded-[24px] border-2 border-ink bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-extrabold text-foreground">Обсуждение</h2>
        <span className="text-[13px] font-semibold text-muted-foreground">Править и удалять можно только свои сообщения</span>
      </div>
      {comments.length === 0 && !list.isLoading && (
        <EmptyState icon={MessagesSquare} tone="bg-sky" title="Вопросов пока нет" text="Участники напишут здесь — вы получите уведомление." />
      )}
      <div className="flex flex-col gap-3">
        {comments.map((c) => (
          <Message key={c.id} c={c} onReply={event.viewer.canComment ? () => setReplyTo(c) : undefined} />
        ))}
      </div>
      {event.viewer.canComment && (
        <form onSubmit={send} className="flex flex-col gap-2">
          {replyTo && (
            <p className="text-sm font-semibold text-muted-foreground">
              Ответ для {fullName(replyTo.author)}{" "}
              <button type="button" className="underline" onClick={() => setReplyTo(undefined)}>отменить</button>
            </p>
          )}
          <div className="flex gap-2.5">
            <input
              value={text}
              maxLength={2000}
              onChange={(e) => setText(e.target.value)}
              aria-label="Сообщение"
              placeholder="Ответить участникам…"
              className="h-12 min-w-0 flex-1 rounded-pill border-2 border-ink bg-card px-4 text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary"
            />
            <Button type="submit" disabled={!text.trim() || create.isPending}>Отправить</Button>
          </div>
          {create.error?.detail && <Warning className="py-2">{create.error.detail}</Warning>}
        </form>
      )}
    </section>
  );
}
