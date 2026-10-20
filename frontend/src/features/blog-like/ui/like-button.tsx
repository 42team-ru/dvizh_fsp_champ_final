import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { cn } from "cn";
import { useBlogLike, useBlogUnlike } from "@/shared/api/generated/core/blog/blog";
import { toast } from "@/shared/lib/toast";

/**
 * Лайк — просто счётчик. Нажатие сразу меняет сердечко (оптимистично), ответ сервера уточняет число;
 * ошибка возвращает как было. Списки блога перезапрашиваются, чтобы карточки не расходились.
 */
export function LikeButton({ postId, liked, count, disabled, size = "md", className }: {
  postId: string;
  liked: boolean;
  count: number;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<{ liked: boolean; count: number } | null>(null);
  const current = state ?? { liked, count };
  const done = (response: { status: number; data: unknown }) => {
    if (response.status === 200) {
      const data = response.data as { likesCount: number; likedByMe: boolean };
      setState({ liked: data.likedByMe, count: data.likesCount });
    }
    void queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/blog/posts") });
  };
  const fail = (error: { detail?: string }) => {
    setState(null);
    toast.error(error.detail ?? "Не получилось. Попробуй ещё раз.");
  };
  const like = useBlogLike({ mutation: { onSuccess: done, onError: fail } });
  const unlike = useBlogUnlike({ mutation: { onSuccess: done, onError: fail } });

  const toggle = () => {
    const next = !current.liked;
    setState({ liked: next, count: current.count + (next ? 1 : -1) });
    (next ? like : unlike).mutate({ id: postId });
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      disabled={disabled || like.isPending || unlike.isPending}
      aria-pressed={current.liked}
      aria-label={current.liked ? `Убрать лайк, сейчас ${current.count}` : `Лайкнуть, сейчас ${current.count}`}
      className={cn(
        "relative z-10 box-border inline-flex items-center gap-1.5 rounded-pill border-2 border-ink font-extrabold transition-transform active:scale-95 disabled:opacity-60",
        size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-10 px-4 text-[15px]",
        current.liked ? "bg-peach" : "bg-card hover:bg-muted",
        className,
      )}
    >
      <Heart className={cn(size === "sm" ? "size-4" : "size-[18px]", current.liked && "fill-accent text-accent")} strokeWidth={2.4} />
      <span className="tabular-nums">{current.count}</span>
    </button>
  );
}
