import type { AlbumFolderResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { cn } from "cn";
import { IMG, coverTone, dateLong, imageUrl } from "../lib/gallery";
import { SportPill } from "./parts";

/** Папки = занятия: обложка стопкой, вид спорта, число фото. Последняя плитка — «Фото с занятия». */
export function AlbumFolders({
  folders,
  onOpen,
  onAdd,
}: {
  folders: AlbumFolderResponse[];
  onOpen(folder: AlbumFolderResponse): void;
  onAdd?: () => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-[22px] sm:gap-x-4 lg:grid-cols-4">
      {folders.map((folder) => (
        <li key={folder.event.id}>
          <button
            type="button"
            onClick={() => onOpen(folder)}
            className="group flex w-full flex-col gap-[10px] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <span className="relative block h-[110px] w-full pr-[10px] pb-[10px] sm:h-[140px]">
              <span className="absolute inset-0 top-[10px] left-[10px] rounded-2xl border-2 border-ink bg-card" />
              <span className="absolute top-[5px] right-[5px] bottom-[5px] left-[5px] rounded-2xl border-2 border-ink bg-card" />
              <span
                className={cn(
                  "relative block h-[100px] overflow-hidden rounded-2xl sm:h-[130px] border-2 border-ink transition-transform group-hover:-translate-x-px group-hover:-translate-y-px",
                  coverTone(folder.event.id),
                )}
              >
                <img src={imageUrl(folder.coverUrl)} alt="" loading="lazy" className="size-full object-cover" />
                <SportPill sport={folder.event.sport} className="absolute top-2 left-2" />
                <span className="absolute right-2 bottom-2 flex items-center gap-[5px] rounded-pill border-[1.5px] border-ink bg-card py-[3px] pr-[9px] pl-2 text-xs font-extrabold text-foreground">
                  <img src={`${IMG}/photo.svg`} alt="" className="size-[14px]" />
                  {folder.photoCount}
                </span>
              </span>
            </span>
            <span className="flex flex-col gap-[3px]">
              <span className="line-clamp-2 text-sm font-extrabold text-foreground">{folder.event.title}</span>
              <span className="text-xs font-medium text-muted-foreground">
                {dateLong(folder.event.startAt)} · {folder.photoCount} фото
              </span>
            </span>
          </button>
        </li>
      ))}
      {onAdd && (
        <li>
          <button
            type="button"
            onClick={onAdd}
            className="group flex w-full flex-col gap-[10px] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <span className="flex h-[100px] w-[calc(100%-10px)] flex-col sm:h-[130px] items-center justify-center gap-2 rounded-2xl border-[2.5px] border-dashed border-primary bg-lime-soft">
              <span className="flex size-11 items-center justify-center rounded-pill border-2 border-ink bg-secondary shadow-[2px_2px_0_var(--ink)] transition-transform group-hover:-translate-y-px">
                <img src={`${IMG}/plus-lg.svg`} alt="" className="size-[18px]" />
              </span>
              <span className="text-[13px] font-extrabold text-foreground">Фото с занятия</span>
            </span>
            <span className="mt-[10px] flex flex-col gap-[3px]">
              <span className="text-sm font-extrabold text-foreground">Выбери занятие и загрузи</span>
              <span className="text-xs font-medium text-muted-foreground">Только с тех, где ты был или организовал</span>
            </span>
          </button>
        </li>
      )}
    </ul>
  );
}
