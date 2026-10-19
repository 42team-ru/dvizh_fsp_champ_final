import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useEventsList } from "@/shared/api/generated/core/events/events";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Input } from "@/shared/components/ui/input";
import { RoughBorder } from "@/shared/components/ui/rough-border";

const WHEN = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Значение, которое обновляется через `delay` мс после последнего изменения. */
function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Поиск событий. Кнопка-иконка в шапке (выделена цветом и рамкой) открывает окно по центру экрана,
 * фон приглушается. Открывается и по Ctrl/⌘+K, закрывается по Esc и клику вне окна.
 */
export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 250);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const search = useEventsList(
    { searchText: debounced || undefined },
    { query: { enabled: open && debounced.length > 0 } },
  );
  const results = search.data?.status === 200 ? search.data.data.slice(0, 6) : [];

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(value) => (value ? setOpen(true) : close())}>
      <DialogPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Поиск (Ctrl+K)"
          className="shrink-0"
        >
          <Icon name="icon-search" className="size-[20px]" />
        </Button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 isolate z-50 bg-ink/40 backdrop-blur-[3px] duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="relative flex max-h-[min(80vh,560px)] flex-col gap-4 rounded-[24px] border-2 border-transparent bg-card p-5 shadow-[6px_6px_0_var(--ink)]">
            <DialogPrimitive.Title className="sr-only">Окно поиска</DialogPrimitive.Title>

            <label className="relative flex items-center">
              <Icon name="icon-search" className="pointer-events-none absolute left-4 size-[20px]" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Найти события"
                aria-label="Поиск событий"
                className="h-14 rounded-pill pl-12 text-base"
              />
            </label>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {debounced.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm font-bold text-muted-foreground">
                  Начните вводить название события или вид спорта.
                </p>
              ) : search.isLoading ? (
                <p className="px-2 py-4 text-center text-sm font-bold text-muted-foreground">Ищем…</p>
              ) : results.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm font-bold text-muted-foreground">
                  Ничего не нашлось. Попробуйте другое слово.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {results.map((event) => (
                    <li key={`${event.id}-${event.occurrenceId ?? ""}`}>
                      <Link
                        to={`/events/${event.id}`}
                        onClick={close}
                        className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-card px-4 py-3 transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-display text-[15px] font-bold text-foreground">
                            {event.title}
                          </span>
                          <span className="truncate text-xs font-semibold text-muted-foreground">
                            {event.sport.name} · {WHEN.format(new Date(event.startAt))}
                          </span>
                        </span>
                        <span aria-hidden="true" className="shrink-0 text-lg font-extrabold text-primary">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t-2 border-dashed border-ink pt-3 text-xs font-bold text-muted-foreground">
              <span>Ctrl + K — открыть поиск</span>
              {debounced.length > 0 ? (
                <Link to="/feed" onClick={close} className="text-primary underline underline-offset-4">
                  Все события в ленте
                </Link>
              ) : (
                <span>Esc — закрыть</span>
              )}
            </div>

            <RoughBorder radius={24} roughness={1.2} bowing={1} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
