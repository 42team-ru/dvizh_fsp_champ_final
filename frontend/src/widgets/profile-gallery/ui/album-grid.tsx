import { useId } from "react";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import type { AlbumPhotoResponse, UsersAlbumSort } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { cn } from "cn";
import { coverTone, imageUrl } from "../lib/gallery";

/** Выпадающий список «Сортировка: сначала новые / старые». */
export function SortSelect({ value, onChange }: { value: UsersAlbumSort; onChange(value: UsersAlbumSort): void }) {
  const id = useId();
  return (
    <div className="relative flex h-[38px] items-center gap-2 rounded-pill border-2 border-ink bg-card pr-9 pl-[14px]">
      <label htmlFor={id} className="text-[9px] font-extrabold tracking-[1.5px] text-muted-foreground">
        СОРТИРОВКА
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as UsersAlbumSort)}
        className="cursor-pointer appearance-none bg-transparent text-[13px] font-extrabold text-foreground outline-none"
      >
        <option value="NEWEST">Сначала новые</option>
        <option value="OLDEST">Сначала старые</option>
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 size-4" />
    </div>
  );
}

/** Сетка фото с подписями; у своих — кнопки «подпись» и «удалить» при наведении. */
export function AlbumGrid({
  photos,
  total,
  dense,
  hasMore,
  loadingMore,
  onMore,
  onOpen,
  onEdit,
  onRemove,
}: {
  photos: AlbumPhotoResponse[];
  total: number;
  /** В папке плитки мельче: шесть в ряд. */
  dense?: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onMore(): void;
  onOpen(index: number): void;
  onEdit(index: number): void;
  onRemove(photo: AlbumPhotoResponse): void;
}) {
  return (
    <div className="flex flex-col items-center gap-[14px]">
      <ul
        className={cn(
          "grid w-full grid-cols-2 gap-3 sm:grid-cols-3",
          dense ? "lg:grid-cols-6" : "lg:grid-cols-5",
        )}
      >
        {photos.map((photo, index) => (
          <li
            key={photo.id}
            className={cn(
              "group relative overflow-hidden rounded-[14px] border-2 border-ink",
              dense ? "aspect-[132/110]" : "aspect-[162/120]",
              coverTone(photo.id),
            )}
          >
            <button
              type="button"
              onClick={() => onOpen(index)}
              aria-label={`Открыть фото ${index + 1}${photo.caption ? `: ${photo.caption}` : ""}`}
              className="block size-full focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring"
            >
              <img src={imageUrl(photo.url)} alt="" loading="lazy" className="size-full object-cover" />
              {photo.caption && (
                <span className="absolute inset-x-0 bottom-0 truncate bg-card/90 px-[7px] py-1 text-left text-[10px] font-bold text-foreground">
                  {photo.caption}
                </span>
              )}
            </button>
            {photo.mine && (
              <div className="absolute top-[6px] right-[6px] flex gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="Изменить подпись"
                  onClick={() => onEdit(index)}
                  className="flex size-7 items-center justify-center rounded-pill border-[1.5px] border-ink bg-card"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Удалить фото"
                  onClick={() => onRemove(photo)}
                  className="flex size-7 items-center justify-center rounded-pill border-[1.5px] border-ink bg-card"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {hasMore && (
        <Button variant="outline" disabled={loadingMore} onClick={onMore} className="px-[18px] text-sm">
          {loadingMore ? "Загружаем…" : `Показать ещё ${total - photos.length}`}
        </Button>
      )}
      <p className="text-[11px] font-medium text-muted-foreground">
        {photos.length} из {total}
      </p>
    </div>
  );
}
