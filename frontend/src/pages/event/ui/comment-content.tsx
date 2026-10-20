import type { CommentResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Linkified } from "@/shared/lib/linkify";
import { COMMENT_DELETED_TEXT, COMMENT_HIDDEN_TEXT } from "@/shared/lib/statuses";

/** Заглушка доступна всем, исходный текст — админу, причина — по правам из ответа API. */
export function CommentContent({ comment, isAdmin }: { comment: CommentResponse; isAdmin: boolean }) {
  if (comment.hidden) return (
    <>
      <span className="block text-muted-foreground italic">{COMMENT_HIDDEN_TEXT}</span>
      {isAdmin && comment.text && <>
        <span className="mt-1 block text-xs font-bold text-muted-foreground">
          Оригинал (видят только админы) · {comment.moderation?.status === "AUTO_HIDDEN" ? "скрыла нейросеть" : "скрыл администратор"}
        </span>
        <span className="block whitespace-pre-wrap text-muted-foreground"><Linkified text={comment.text} /></span>
      </>}
      {comment.hiddenReason && <span className="mt-1 block text-muted-foreground">Причина: {comment.hiddenReason}</span>}
    </>
  );
  return comment.deleted ? <span className="text-muted-foreground italic">{COMMENT_DELETED_TEXT}</span> : <Linkified text={comment.text ?? ""} />;
}
