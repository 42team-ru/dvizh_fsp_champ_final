import { useQueryClient } from "@tanstack/react-query";
import { useRecommendationsDismiss, useRecommendationsUndismiss } from "@/shared/api/generated/core/recommendations/recommendations";
import { toast } from "@/shared/lib/toast";
import { cn } from "cn";

/** Все запросы подборки (лента «Для вас», превью на главной, похожие) — перезапросить после скрытия. */
const isRecommendations = (key: readonly unknown[]) => String(key[0]).startsWith("/api/recommendations");

/**
 * «Не интересно» в подборке: встреча скрывается, похожие на неё опускаются ниже (формула — docs/recommendations.md).
 * В уведомлении — «Вернуть» на случай промаха.
 */
export function useDismissRecommendation() {
  const cache = useQueryClient();
  const refresh = () => cache.invalidateQueries({ predicate: (q) => isRecommendations(q.queryKey) });
  const undismiss = useRecommendationsUndismiss({ mutation: { onSuccess: () => { void refresh(); toast.info("Вернули в подборку"); } } });
  const dismiss = useRecommendationsDismiss({ mutation: {
    onSuccess: (_, { eventId }) => {
      void refresh();
      toast.success("Скрыли из подборки", {
        description: (
          <>
            Похожие встречи будут ниже.{" "}
            <button type="button" className="font-extrabold underline underline-offset-2" onClick={() => undismiss.mutate({ eventId })}>
              Вернуть
            </button>
          </>
        ),
      });
    },
    onError: (error) => toast.error("Не удалось скрыть", { description: error.detail ?? "Попробуйте ещё раз" }),
  } });
  return {
    dismiss: (eventId: string) => dismiss.mutate({ eventId, data: { reason: "NOT_INTERESTED" } }),
    pending: dismiss.isPending,
  };
}

/** Кнопка «Не интересно» поверх карточки подборки: не открывает карточку, только скрывает. */
export function DismissButton({ onDismiss, disabled, className }: { onDismiss(): void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label="Не интересно — скрыть из подборки"
      title="Не интересно — скрыть из подборки"
      onClick={(event) => {
        // карточка целиком — ссылка: клик по кнопке не должен её открывать
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }}
      className={cn(
        "z-20 inline-flex h-8 items-center gap-1 rounded-pill border-2 border-ink bg-card px-3 text-xs font-extrabold text-foreground",
        "shadow-hard-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ink disabled:opacity-50",
        className,
      )}
    >
      <span aria-hidden="true">✕</span> Не интересно
    </button>
  );
}
