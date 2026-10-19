import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import type { AlbumPhotoResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { useUsersCaptionAlbumPhoto } from "@/shared/api/generated/core/users/users";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { cn } from "cn";
import { CAPTION_MAX, IMG, coverTone, dateShort, dateTime, imageUrl } from "../lib/gallery";
import { useRefreshGallery } from "../model/use-album";
import { Counter, FieldLabel, RoundButton, SportPill } from "./parts";
import { handle } from "@/shared/lib/handle";

export type GalleryOwner = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
};

/**
 * Просмотр фото альбома: слева снимок со стрелками, справа автор, занятие и подпись.
 * Своё фото можно подписать и удалить, чужое — только посмотреть. ← → листают, Esc закрывает.
 */
export function PhotoViewer({
  photos,
  index,
  owner,
  folderCounts,
  focusCaption,
  onIndex,
  onClose,
  onRemove,
}: {
  photos: AlbumPhotoResponse[];
  index: number | null;
  owner: GalleryOwner;
  /** Сколько фото в папке занятия: eventId → число. */
  folderCounts: Map<string, number>;
  focusCaption?: boolean;
  onIndex(index: number): void;
  onClose(): void;
  onRemove(photo: AlbumPhotoResponse): void;
}) {
  const photo = index === null ? undefined : photos[index];
  return (
    <Dialog open={Boolean(photo)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92dvh] gap-0 overflow-y-auto rounded-[24px] border-[2.5px] border-ink p-0 shadow-[8px_8px_0_var(--ink)] ring-0 sm:max-w-[1040px] lg:overflow-hidden"
      >
        {photo && index !== null && (
          <ViewerBody
            key={photo.id}
            photo={photo}
            index={index}
            count={photos.length}
            owner={owner}
            inFolder={folderCounts.get(photo.event.id)}
            focusCaption={focusCaption}
            onIndex={onIndex}
            onClose={onClose}
            onRemove={onRemove}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ViewerBody({
  photo,
  index,
  count,
  owner,
  inFolder,
  focusCaption,
  onIndex,
  onClose,
  onRemove,
}: {
  photo: AlbumPhotoResponse;
  index: number;
  count: number;
  owner: GalleryOwner;
  inFolder?: number;
  focusCaption?: boolean;
  onIndex(index: number): void;
  onClose(): void;
  onRemove(photo: AlbumPhotoResponse): void;
}) {
  const captionId = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(photo.caption ?? "");
  const refresh = useRefreshGallery(owner.id);
  const save = useUsersCaptionAlbumPhoto({
    mutation: {
      onSuccess: () => {
        void refresh();
        toast.success("Подпись сохранена");
      },
      onError: (error) => toast.error(error.detail ?? "Не удалось сохранить подпись. Попробуй ещё раз."),
    },
  });
  const prev = () => onIndex((index - 1 + count) % count);
  const next = () => onIndex((index + 1) % count);
  const name = [owner.firstName, owner.lastName].filter(Boolean).join(" ") || owner.username || "";
  const changed = draft.trim() !== (photo.caption ?? "");

  useEffect(() => {
    if (focusCaption) textarea.current?.focus();
  }, [focusCaption]);

  useEffect(() => {
    if (count < 2) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft") prev();
      if (event.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="grid lg:h-[600px] lg:grid-cols-[1fr_2px_358px]">
      <div className={cn("relative h-[52dvh] min-h-[280px] lg:h-full", coverTone(photo.id))}>
        <img src={imageUrl(photo.url)} alt={photo.caption ?? `Фото с занятия «${photo.event.title}»`} className="size-full object-contain" />
        <span className="absolute top-[14px] left-[14px] rounded-pill border-[1.5px] border-ink bg-card px-3 py-[5px] text-xs font-extrabold text-foreground">
          {index + 1} / {count}
        </span>
        {count > 1 && (
          <>
            <RoundButton icon="chev-left" label="Предыдущее фото" onClick={prev} iconClassName="size-[18px]"
              className="absolute top-1/2 left-[14px] size-11 -translate-y-1/2 bg-secondary" />
            <RoundButton icon="chev-right" label="Следующее фото" onClick={next} iconClassName="size-[18px]"
              className="absolute top-1/2 right-[14px] size-11 -translate-y-1/2 bg-secondary" />
          </>
        )}
      </div>
      <div aria-hidden className="hidden bg-ink lg:block" />

      <div className="flex flex-col gap-4 border-t-2 border-ink p-6 lg:border-t-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar user={owner} className="size-[42px] shrink-0 rounded-pill border-2 border-ink object-cover" />
            <div className="flex min-w-0 flex-col gap-[2px]">
              <DialogTitle className="truncate text-[15px] font-extrabold text-foreground">{name}</DialogTitle>
              <DialogDescription className="truncate text-xs font-medium text-muted-foreground">
                {owner.username ? `${handle(owner.username)} · ` : ""}
                {dateTime(photo.createdAt)}
              </DialogDescription>
            </div>
          </div>
          <RoundButton icon="x" label="Закрыть" onClick={onClose} className="size-9" iconClassName="size-[14px]" />
        </div>

        <Link
          to={`/events/${photo.event.id}`}
          className="flex flex-col gap-[6px] rounded-[14px] border-[1.5px] border-ink bg-sky-soft px-[14px] py-3 transition-colors hover:bg-sky/40"
        >
          <span className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground">ЗАНЯТИЕ</span>
            <SportPill sport={photo.event.sport} />
          </span>
          <span className="text-[15px] font-extrabold text-foreground">{photo.event.title}</span>
          <span className="flex items-center gap-[6px] text-xs font-medium text-muted-foreground">
            {dateShort(photo.event.startAt)}
            {inFolder ? ` · ${inFolder} фото в папке` : ""}
            <img src={`${IMG}/arrow.svg`} alt="" className="size-[10px]" />
          </span>
        </Link>

        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor={captionId}>ПОДПИСЬ</FieldLabel>
          {photo.mine ? (
            <div className="relative">
              <textarea
                id={captionId}
                ref={textarea}
                value={draft}
                maxLength={CAPTION_MAX}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Например: Финиш у моста"
                className="h-[92px] w-full resize-none rounded-[14px] border-[2.5px] border-primary bg-card px-3 pt-[9px] pb-6 text-[15px] font-bold text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
              />
              <span className="absolute right-3 bottom-2">
                <Counter value={draft.length} max={CAPTION_MAX} />
              </span>
            </div>
          ) : (
            <p id={captionId} className="text-[15px] font-bold text-foreground">
              {photo.caption ?? <span className="text-muted-foreground">Без подписи</span>}
            </p>
          )}
        </div>

        <div className="hidden flex-1 lg:block" />

        {photo.mine && (
          <>
            <Button
              className="w-full text-sm"
              disabled={!changed || save.isPending}
              onClick={() => save.mutate({ fileId: photo.id, data: { caption: draft } })}
            >
              {save.isPending ? "Сохраняем…" : "Сохранить подпись"}
            </Button>
            <button
              type="button"
              onClick={() => onRemove(photo)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-pill border-2 border-accent bg-card text-sm font-extrabold text-foreground transition-colors hover:bg-peach"
            >
              <img src={`${IMG}/trash.svg`} alt="" className="size-[14px]" />
              Удалить фото
            </button>
          </>
        )}
        <p className="hidden text-[11px] leading-4 font-medium text-muted-foreground lg:block">
          ← → листать · Esc закрыть
        </p>
      </div>
    </div>
  );
}
