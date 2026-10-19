import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { AlbumPhotoResponse, UsersAlbumSort } from "@/shared/api/generated/core/appAPI.schemas";
import { useUsersRemoveAlbumPhoto } from "@/shared/api/generated/core/users/users";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { useAlbumPhotos, useRefreshGallery } from "../model/use-album";
import { AlbumGrid } from "./album-grid";
import { EmptyState } from "./parts";
import { PhotoViewer, type GalleryOwner } from "./photo-viewer";

/** Фото альбома по фильтру (вся лента или одна папка) с просмотром и удалением своих. */
export function AlbumPhotosView({
  owner,
  eventId,
  sportId,
  sort,
  dense,
  folderCounts,
  empty,
}: {
  owner: GalleryOwner;
  eventId?: string;
  sportId?: string;
  sort: UsersAlbumSort;
  dense?: boolean;
  folderCounts: Map<string, number>;
  empty: ReactNode;
}) {
  const { query, photos, total } = useAlbumPhotos(owner.id, { eventId, sportId, sort });
  const [viewer, setViewer] = useState<{ index: number; caption?: boolean } | null>(null);
  const [removing, setRemoving] = useState<AlbumPhotoResponse | null>(null);
  const refresh = useRefreshGallery(owner.id);
  const remove = useUsersRemoveAlbumPhoto({
    mutation: {
      onSuccess: () => {
        setRemoving(null);
        setViewer(null);
        void refresh();
        toast.success("Фото удалено");
      },
      onError: (error) => toast.error(error.detail ?? "Не удалось удалить фото. Попробуй ещё раз."),
    },
  });

  if (query.isPending) {
    return <p role="status" className="py-6 text-center text-sm text-muted-foreground">Загружаем фото…</p>;
  }
  if (query.isError) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-center gap-3 py-6 text-sm">
        Не удалось загрузить фото.
        <Button variant="soft" onClick={() => void query.refetch()}>Повторить</Button>
      </div>
    );
  }
  if (photos.length === 0) return <>{empty}</>;

  return (
    <>
      <AlbumGrid
        photos={photos}
        total={total}
        dense={dense}
        hasMore={query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        onMore={() => void query.fetchNextPage()}
        onOpen={(index) => setViewer({ index })}
        onEdit={(index) => setViewer({ index, caption: true })}
        onRemove={setRemoving}
      />
      <PhotoViewer
        photos={photos}
        index={viewer?.index ?? null}
        focusCaption={viewer?.caption}
        owner={owner}
        folderCounts={folderCounts}
        onIndex={(index) => setViewer({ index })}
        onClose={() => setViewer(null)}
        onRemove={setRemoving}
      />
      <Dialog open={Boolean(removing)} onOpenChange={(open) => !open && !remove.isPending && setRemoving(null)}>
        <DialogContent>
          <DialogTitle>Удалить фото?</DialogTitle>
          <DialogDescription>Фото исчезнет из папки занятия и из «Все фото».</DialogDescription>
          <div className="flex flex-wrap gap-3">
            <Button variant="soft" disabled={remove.isPending} onClick={() => setRemoving(null)}>Оставить</Button>
            <Button variant="destructive" disabled={remove.isPending}
              onClick={() => removing && remove.mutate({ fileId: removing.id })}>
              {remove.isPending ? "Удаляем…" : "Удалить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
