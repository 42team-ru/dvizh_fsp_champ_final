import type { CommentResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Linkified } from "@/shared/lib/linkify";

/** Заглушка доступна всем, исходный текст — админу, причина — по правам из ответа API. */
export function CommentContent({ comment, isAdmin }: { comment: CommentResponse; isAdmin: boolean }) {
  if (comment.hidden) return (
    <>
      <span className="block text-muted-foreground italic">Удалено администратором</span>
      {isAdmin && comment.text && <span className="mt-1 block whitespace-pre-wrap text-muted-foreground"><Linkified text={comment.text} /></span>}
      {comment.hiddenReason && <span className="mt-1 block text-muted-foreground">Причина: {comment.hiddenReason}</span>}
    </>
  );
  return comment.deleted ? <span className="text-muted-foreground italic">Сообщение удалено</span> : <Linkified text={comment.text ?? ""} />;
}
