import { Info, X } from "lucide-react";
import type { FileResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { cn } from "cn";
import { ABOUT_LIMIT, IMG, coverTone, imageUrl } from "../lib/gallery";

/** «Обо мне»: до шести личных фото, видны всем вошедшим. Свободные места — пунктирные слоты. */
export function AboutPhotos({
  photos,
  owner,
  busy,
  onAdd,
  onOpen,
  onRemove,
}: {
  photos: FileResponse[];
  owner: boolean;
  busy: boolean;
  onAdd(): void;
  onOpen(photo: FileResponse): void;
  onRemove(photo: FileResponse): void;
}) {
  const free = Math.max(ABOUT_LIMIT - photos.length, 0);
  return (
    <div className="flex flex-col gap-4">
      {owner && (
        <div className="flex items-center gap-3 rounded-[14px] border-2 border-primary bg-lavender-soft px-4 py-3">
          <Info aria-hidden className="size-4 shrink-0 text-primary" />
          <p className="flex-1 text-[13px] font-semibold text-foreground">
            Эти фото видят все, кто вошёл в приложение. Аватар не меняется. JPG, PNG, WebP до 5 МБ.
          </p>
          <span className="shrink-0 rounded-pill border-[1.5px] border-ink bg-secondary px-[10px] py-[3px] text-[11px] font-extrabold text-foreground">
            {photos.length} из {ABOUT_LIMIT}
          </span>
        </div>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {photos.map((photo, index) => (
          <li key={photo.id} className={cn("relative aspect-[132/170] overflow-hidden rounded-2xl border-2 border-ink", coverTone(photo.id))}>
            <button
              type="button"
              onClick={() => onOpen(photo)}
              aria-label={`Открыть фото ${index + 1}`}
              className="block size-full focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring"
            >
              <img src={imageUrl(photo.url)} alt="" loading="lazy" className="size-full object-cover" />
            </button>
            {owner && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onRemove(photo)}
                aria-label={`Удалить фото ${index + 1}`}
                className="absolute top-[6px] right-[6px] flex size-7 items-center justify-center rounded-pill border-[1.5px] border-ink bg-card disabled:opacity-50"
              >
                <X className="size-3.5" strokeWidth={3} />
              </button>
            )}
          </li>
        ))}
        {owner &&
          Array.from({ length: free }, (_, i) =>
            i === 0 ? (
              <li key="add">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onAdd}
                  className="flex aspect-[132/170] w-full flex-col items-center justify-center gap-2 rounded-2xl border-[2.5px] border-dashed border-primary bg-lime-soft disabled:opacity-60"
                >
                  <span className="flex size-10 items-center justify-center rounded-pill border-2 border-ink bg-secondary shadow-[2px_2px_0_var(--ink)]">
                    <img src={`${IMG}/plus-lg.svg`} alt="" className="size-4" />
                  </span>
                  <span className="text-[13px] font-extrabold text-foreground">{busy ? "Загружаем…" : "Добавить"}</span>
                </button>
              </li>
            ) : (
              <li
                key={`slot-${i}`}
                aria-hidden
                className="flex aspect-[132/170] items-center justify-center rounded-2xl border-2 border-dashed border-track text-xl font-bold text-track"
              >
                +
              </li>
            ),
          )}
      </ul>
      {owner && free === 0 && (
        <p className="text-xs font-medium text-muted-foreground">Уже 6 фото — удали одно, чтобы добавить новое.</p>
      )}
    </div>
  );
}
