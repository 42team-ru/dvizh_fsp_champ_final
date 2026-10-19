import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { Check, Upload } from "lucide-react";
import { toast } from "sonner";
import { useUsersAddAlbumPhoto, useUsersAlbumEligibleEvents } from "@/shared/api/generated/core/users/users";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { cn } from "cn";
import { CAPTION_MAX, dateShort, fileProblem } from "../lib/gallery";
import { useRefreshGallery } from "../model/use-album";
import { Counter, EmptyState, FieldLabel, RoundButton, SportPill } from "./parts";

/** «Добавить фото»: выбрать занятие → файл → подпись. Фото попадает в папку занятия и в «Все фото». */
export function AddPhotoDialog({
  userId,
  open,
  eventId,
  onClose,
}: {
  userId: string;
  open: boolean;
  /** Открыто из папки: занятие уже выбрано. */
  eventId?: string;
  onClose(): void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92dvh] gap-0 overflow-y-auto rounded-[24px] border-[2.5px] border-ink p-0 shadow-[8px_8px_0_var(--ink)] ring-0 sm:max-w-[820px]"
      >
        {open && <AddPhotoBody userId={userId} initialEventId={eventId} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function AddPhotoBody({ userId, initialEventId, onClose }: { userId: string; initialEventId?: string; onClose(): void }) {
  const captionId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [eventId, setEventId] = useState(initialEventId);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [caption, setCaption] = useState("");
  const [dragging, setDragging] = useState(false);
  const eligible = useUsersAlbumEligibleEvents();
  const events = eligible.data?.status === 200 ? eligible.data.data : [];
  const refresh = useRefreshGallery(userId);
  const add = useUsersAddAlbumPhoto({
    mutation: {
      onSuccess: () => {
        void refresh();
        toast.success("Фото добавлено в альбом");
        onClose();
      },
      onError: (error) => toast.error(error.detail ?? "Не удалось загрузить фото. Попробуй ещё раз."),
    },
  });

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const pick = (next?: File) => {
    if (!next) return;
    const problem = fileProblem(next);
    if (problem) {
      toast.error(problem);
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-extrabold tracking-[2px] text-primary">ГАЛЕРЕЯ</span>
        <DialogTitle className="font-display text-[22px] leading-7 font-extrabold text-foreground">Добавить фото</DialogTitle>
        <DialogDescription className="sr-only">Выбери занятие, файл и подпись</DialogDescription>
      </div>
      <RoundButton icon="x" label="Закрыть" onClick={onClose} className="size-10" />
    </div>
  );

  if (eligible.isSuccess && events.length === 0) {
    return (
      <div className="flex flex-col gap-5 p-7">
        {header}
        <EmptyState
          kind="nothing"
          title="Пока не с чем сопоставить"
          text="Фото можно добавить с занятия, где у тебя подтверждённая запись или ты организатор."
        >
          <Button asChild className="mt-1 text-sm">
            <Link to="/">Найти занятие</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5 p-7"
      onSubmit={(e) => {
        e.preventDefault();
        if (eventId && file) add.mutate({ data: { file }, params: { eventId, caption: caption.trim() || undefined } });
      }}
      aria-busy={add.isPending}
    >
      {header}
      <div className="grid gap-5 sm:grid-cols-2">
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-2 text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground">1 · С КАКОГО ЗАНЯТИЯ</legend>
          {eligible.isPending ? (
            <p role="status" className="text-sm text-muted-foreground">Загружаем занятия…</p>
          ) : (
            <ul className="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1">
              {events.map((event) => {
                const selected = event.id === eventId;
                return (
                  <li key={event.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-[14px] border-2 px-3 py-[10px] transition-colors has-focus-visible:ring-[3px] has-focus-visible:ring-ring/40",
                        selected ? "border-primary bg-lime-soft" : "border-ink bg-card hover:bg-muted",
                      )}
                    >
                      <input
                        type="radio"
                        name="album-event"
                        value={event.id}
                        checked={selected}
                        onChange={() => setEventId(event.id)}
                        className="sr-only"
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-center gap-2">
                          <SportPill sport={event.sport} />
                          <span className="text-[11px] font-medium text-muted-foreground">{dateShort(event.startAt)}</span>
                        </span>
                        <span className="truncate text-[13px] font-extrabold text-foreground">{event.title}</span>
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-pill border-2 border-ink",
                          selected ? "bg-secondary" : "bg-card",
                        )}
                      >
                        {selected && <Check className="size-3" strokeWidth={3} />}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[11px] leading-4 font-medium text-muted-foreground">
            Показаны занятия, где у тебя подтверждённая запись или ты организатор. Новые сверху.
          </p>
        </fieldset>

        <div className="flex min-w-0 flex-col gap-3">
          <FieldLabel>2 · ФОТО</FieldLabel>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files[0]);
            }}
            className={cn(
              "relative flex h-[150px] flex-col items-center justify-center gap-2 overflow-hidden rounded-[14px] border-[2.5px] border-dashed border-primary p-3 text-center",
              dragging ? "bg-lilac" : "bg-lavender-soft",
            )}
          >
            {preview ? (
              <>
                <img src={preview} alt="Выбранное фото" className="absolute inset-0 size-full object-cover" />
                <Button type="button" variant="outline" size="sm" className="relative mt-auto text-xs"
                  onClick={() => input.current?.click()}>
                  Выбрать другое
                </Button>
              </>
            ) : (
              <>
                <span className="flex size-8 items-center justify-center rounded-pill border-2 border-ink bg-card">
                  <Upload className="size-4" />
                </span>
                <span className="text-[13px] font-extrabold text-foreground">Перетащи фото сюда</span>
                <span className="text-[11px] font-medium text-muted-foreground">или выбери файл · JPG, PNG, WebP до 5 МБ</span>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => input.current?.click()}>
                  Выбрать файл
                </Button>
              </>
            )}
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Файл фото"
              className="sr-only"
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <FieldLabel htmlFor={captionId}>ПОДПИСЬ · НЕОБЯЗАТЕЛЬНО</FieldLabel>
          <div className="relative">
            <textarea
              id={captionId}
              value={caption}
              maxLength={CAPTION_MAX}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Например: Финиш у моста"
              className="h-[72px] w-full resize-none rounded-[14px] border-2 border-ink bg-card px-3 pt-2 pb-6 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary"
            />
            <span className="absolute right-3 bottom-2">
              <Counter value={caption.length} max={CAPTION_MAX} />
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-medium text-muted-foreground">Фото появится в папке этого занятия и в «Все фото»</p>
        <div className="flex gap-[10px]">
          <Button type="button" variant="outline" onClick={onClose} disabled={add.isPending} className="text-sm">
            Отмена
          </Button>
          <Button type="submit" disabled={!eventId || !file || add.isPending} className="text-sm">
            {add.isPending ? "Загружаем…" : "Добавить фото"}
          </Button>
        </div>
      </div>
    </form>
  );
}
