import { useId, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import type { CommentResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { FieldLabel } from "@/shared/components/ui/field";
import type { CommentModeration } from "../model/use-comment-moderation";

export function CommentModerationAction({ comment, moderation }: { comment: CommentResponse; moderation: CommentModeration }) {
  if (!moderation.isAdmin || (comment.deleted && !comment.hidden)) return null;
  return (
    <Button type="button" variant="ghost" size="xs" className="mt-1 self-start px-2 text-muted-foreground hover:text-destructive"
      disabled={moderation.pending} aria-haspopup={comment.hidden ? undefined : "dialog"}
      onClick={() => comment.hidden ? moderation.restore(comment.id) : moderation.open(comment)}>
      {comment.hidden ? <RotateCcw className="size-4" /> : <Trash2 className="size-4" />}
      {comment.hidden ? "Вернуть" : "Удалить"}
    </Button>
  );
}

/** Один диалог на поток, общий для мобильной версии, десктопа и админки. */
export function CommentModerationDialog({ moderation }: { moderation: CommentModeration }) {
  if (!moderation.isAdmin || !moderation.selected) return null;
  return <RemoveDialog key={moderation.selected.id} moderation={moderation} />;
}

/** Шаблоны причины: один клик вместо набора текста. */
export const REMOVE_REASONS = [
  "Реклама", "Мошенничество", "Оскорбления", "Мат", "Угрозы", "Травля", "Разжигание ненависти",
  "Непристойности", "Личные данные", "Спам и флуд", "Не по теме", "Провокация",
];

/** Шаблон по нарушению, которое нашла автопроверка. */
const REASON_BY_CATEGORY: Record<string, string> = {
  PROFANITY: "Мат", INSULT: "Оскорбления", HARASSMENT: "Травля", HATE: "Разжигание ненависти",
  THREAT: "Угрозы", SEXUAL: "Непристойности", SPAM: "Реклама", OFF_TOPIC: "Не по теме",
};
export const reasonForCategories = (categories?: string[]) =>
  categories?.map((c) => REASON_BY_CATEGORY[c]).find(Boolean) ?? "";

function RemoveDialog({ moderation }: { moderation: CommentModeration }) {
  return (
    <RemoveCommentDialog text={moderation.selected?.text} pending={moderation.pending} error={moderation.error}
      onClose={moderation.close} onRestoreFocus={moderation.restoreFocus} onRemove={moderation.remove} />
  );
}

/** Форма удаления сообщения с причиной: общая для обсуждения и очереди «Модерация». */
export function RemoveCommentDialog({ text, initialReason = "", pending, error, onClose, onRestoreFocus, onRemove }: {
  text?: string;
  initialReason?: string;
  pending: boolean;
  error?: string;
  onClose: () => void;
  onRestoreFocus?: () => void;
  onRemove: (reason: string) => void;
}) {
  const [reason, setReason] = useState(initialReason);
  const reasonId = useId();
  const hintId = useId();
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} onCloseAutoFocus={(event) => { if (onRestoreFocus) { event.preventDefault(); onRestoreFocus(); } }} className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-2 border-ink bg-card shadow-hard sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">Удалить сообщение?</DialogTitle>
          <DialogDescription>В обсуждении останется заглушка. Причину увидят автор и администраторы.</DialogDescription>
        </DialogHeader>
        <p className="line-clamp-3 break-words rounded-xl bg-muted p-3 text-sm text-muted-foreground">{text}</p>
        <form className="flex min-w-0 flex-col gap-4" onSubmit={(event) => { event.preventDefault(); if (reason.trim() && !pending) onRemove(reason.trim()); }}>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor={reasonId}>Причина удаления *</FieldLabel>
            <textarea id={reasonId} required maxLength={1000} rows={3} value={reason} disabled={pending}
              aria-describedby={hintId} placeholder="Укажите причину удаления"
              onChange={(event) => setReason(event.target.value)}
              className="w-full resize-y rounded-xl border-2 border-ink bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <p id={hintId} className="text-xs text-muted-foreground">Обязательное поле, до 1000 символов</p>
            <div className="flex flex-wrap gap-2">
              {REMOVE_REASONS.map((preset) => (
                <Button key={preset} type="button" size="chip" variant={reason === preset ? "secondary" : "outline"}
                  aria-pressed={reason === preset} disabled={pending} onClick={() => setReason(preset)}>{preset}</Button>
              ))}
            </div>
          </div>
          {error && <p role="alert" className="text-sm font-bold text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Отмена</Button>
            <Button type="submit" variant="destructive" disabled={pending || !reason.trim()}><Trash2 className="size-4" />Удалить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
