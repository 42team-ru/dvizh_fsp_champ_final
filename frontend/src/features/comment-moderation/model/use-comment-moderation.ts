import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/entity/user/model/use-user";
import { useAdminHideComment, useAdminUnhideComment } from "@/shared/api/generated/core/admin/admin";
import { getCommentsListQueryKey } from "@/shared/api/generated/core/comments/comments";
import type { CommentResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { toast } from "@/shared/lib/toast";

/** Модерация отдельного сообщения через существующий API; поток перечитывается после решения. */
export function useCommentModeration(eventId: string) {
  const { user } = useUser();
  const client = useQueryClient();
  const trigger = useRef<HTMLElement | null>(null);
  const [selected, setSelected] = useState<CommentResponse>();
  const refresh = () => client.invalidateQueries({ queryKey: getCommentsListQueryKey(eventId) });
  const hide = useAdminHideComment({ mutation: {
    onSuccess: async () => {
      toast.success("Сообщение удалено");
      setSelected(undefined);
      await refresh();
    },
  } });
  const unhide = useAdminUnhideComment({ mutation: {
    onSuccess: async () => {
      toast.success("Сообщение возвращено");
      await refresh();
    },
    onError: (error) => toast.error(error.detail ?? "Не удалось вернуть сообщение"),
  } });
  const isAdmin = user?.systemRole === "ADMIN";
  const pending = hide.isPending || unhide.isPending;
  return {
    isAdmin,
    selected,
    pending,
    error: hide.error?.detail,
    open: (comment: CommentResponse) => {
      if (!isAdmin || pending) return;
      trigger.current = document.activeElement as HTMLElement;
      hide.reset();
      setSelected(comment);
    },
    restoreFocus: () => trigger.current?.focus(),
    close: () => { if (!pending) setSelected(undefined); },
    remove: (reason: string) => {
      if (isAdmin && selected && reason.trim() && !pending) hide.mutate({ id: selected.id, data: { reason: reason.trim() } });
    },
    restore: (id: string) => { if (isAdmin && !pending) unhide.mutate({ id }); },
  };
}

export type CommentModeration = ReturnType<typeof useCommentModeration>;
