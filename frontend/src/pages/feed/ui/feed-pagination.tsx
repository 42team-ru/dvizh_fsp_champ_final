import { useEffect, useRef } from "react";
import type { useFeedEvents } from "@/entity/event/model/use-feed-events";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

type FeedPaginationProps = Pick<ReturnType<typeof useFeedEvents>,
  "hasNextPage" | "isFetching" | "isFetchingNextPage" | "isFetchNextPageError" | "fetchNextPage" | "isPending" | "isError"
>;

/** Общий конец списка для обеих раскладок; скрытая через CSS лента не запускает подгрузку. */
export function FeedPagination({
  hasNextPage, isFetching, isFetchingNextPage, isFetchNextPageError, fetchNextPage, isPending, isError,
}: FeedPaginationProps) {
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage || isFetching || isError || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && node.getClientRects().length > 0) {
        void fetchNextPage({ cancelRefetch: false });
      }
    }, { rootMargin: "600px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, isError, fetchNextPage]);

  return (
    <div className="flex flex-col gap-5">
      <div ref={sentinel} className="h-px" aria-hidden="true" />
      {(isPending || isFetchingNextPage) && (
        <div role="status" aria-label="Загружаем события" className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} aria-hidden="true" className="overflow-hidden p-0 motion-safe:animate-pulse">
              <div className="h-32 bg-muted" />
              <div className="flex flex-col gap-3 p-4">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
                <div className="h-4 rounded bg-muted" />
              </div>
            </Card>
          ))}
          <span className="sr-only">Загружаем события…</span>
        </div>
      )}
      {isFetchNextPageError && (
        <p role="alert" className="text-center font-semibold text-destructive">
          Не удалось загрузить следующие события. Попробуйте ещё раз.
        </p>
      )}
      {hasNextPage && (
        <Button type="button" variant="soft" className="self-center" disabled={isFetching}
          onClick={() => { void fetchNextPage({ cancelRefetch: false }); }}>
          {isFetchingNextPage ? "Загружаем…" : "Показать ещё"}
        </Button>
      )}
      {!isPending && !isError && !hasNextPage && (
        <p role="status" className="text-center text-sm font-semibold text-muted-foreground">
          Это все события по фильтрам
        </p>
      )}
    </div>
  );
}
