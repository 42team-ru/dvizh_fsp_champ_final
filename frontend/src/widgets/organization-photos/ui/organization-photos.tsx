import { useState } from "react";
import { Camera } from "lucide-react";
import { useOrganizationsPhotos } from "@/shared/api/generated/core/organizations/organizations";
import type {
  FileResponse,
  OrganizationOverviewResponse,
} from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";

function Thumbnail({
  photo,
  onClick,
}: {
  photo: FileResponse;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-square overflow-hidden rounded-[16px] border-2 border-ink bg-lavender-soft focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Открыть фото ${photo.name}`}
    >
      <img
        src={photo.url}
        alt={photo.name}
        loading="lazy"
        className="size-full object-cover"
        style={{
          objectPosition: `${photo.focus?.x ?? 50}% ${photo.focus?.y ?? 50}%`,
        }}
      />
    </button>
  );
}

export function OrganizationPhotos({
  id,
  overview: o,
}: {
  id: string;
  overview: OrganizationOverviewResponse;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FileResponse>();
  const [page, setPage] = useState(0);
  const query = useOrganizationsPhotos(
    id,
    { page, size: 24 },
    { query: { enabled: open } },
  );
  const photos = query.data?.data;
  return (
    <section id="photos" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-display text-[23px] font-extrabold">
          Фото с встреч
        </h2>
        <span className="text-xs font-semibold text-muted-foreground">
          {o.photosCount} фото из {o.photoMeetingsCount} встреч
        </span>
        {o.photosCount > 0 && (
          <button
            type="button"
            className="ml-auto text-xs font-extrabold hover:underline"
            onClick={() => setOpen(true)}
          >
            Все фото →
          </button>
        )}
      </div>
      {o.photosCount > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {o.photos.items.slice(0, 5).map((p) => (
            <Thumbnail
              key={p.id}
              photo={p}
              onClick={() => {
                setSelected(p);
                setOpen(true);
              }}
            />
          ))}
          {o.photosCount > 5 && (
            <button
              type="button"
              onClick={() => {
                setSelected(undefined);
                setOpen(true);
              }}
              className="flex aspect-square flex-col items-center justify-center rounded-[16px] border-2 border-ink bg-ink text-lime"
            >
              <span className="font-display text-xl font-extrabold">
                +{o.photosCount - 5}
              </span>
              <span className="text-xs font-bold text-primary-foreground">
                фото
              </span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-[20px] border-2 border-dashed border-muted-foreground bg-card p-5 text-sm font-semibold text-muted-foreground">
          <Camera className="size-6" />
          Фото появятся после встреч клуба.
        </div>
      )}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setSelected(undefined);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-2 border-ink bg-card p-5 shadow-hard sm:max-w-[900px]">
          <DialogTitle className="font-display text-xl font-extrabold">
            Фото с встреч
          </DialogTitle>
          <DialogDescription>
            Фотографии мероприятий и альбомов участников клуба.
          </DialogDescription>
          {selected ? (
            <>
              <img
                src={selected.url}
                alt={selected.name}
                className="max-h-[65dvh] w-full rounded-xl object-contain"
              />
              <Button variant="soft" onClick={() => setSelected(undefined)}>
                Ко всем фото
              </Button>
            </>
          ) : (
            <>
              {query.isPending && <p role="status">Загружаем фото…</p>}
              {query.isError && (
                <p role="alert">
                  Не удалось загрузить фото.{" "}
                  <button
                    className="underline"
                    onClick={() => void query.refetch()}
                  >
                    Повторить
                  </button>
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos?.items.map((p) => (
                  <Thumbnail
                    key={p.id}
                    photo={p}
                    onClick={() => setSelected(p)}
                  />
                ))}
              </div>
              <div className="flex justify-between gap-3">
                <Button
                  variant="soft"
                  disabled={page === 0 || query.isFetching}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Назад
                </Button>
                <Button
                  variant="soft"
                  disabled={
                    !photos || page + 1 >= photos.totalPages || query.isFetching
                  }
                  onClick={() => setPage((p) => p + 1)}
                >
                  Дальше
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
