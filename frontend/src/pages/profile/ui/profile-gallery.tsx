import { useRef, useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUser } from "@/entity/user/model/use-user";
import type { FileResponse } from "@/shared/api/generated/core/appAPI.schemas";
import {
  getUsersGetQueryKey,
  getUsersMyPhotosQueryKey,
  useUsersAddPhoto,
  useUsersMyPhotos,
  useUsersRemovePhoto,
} from "@/shared/api/generated/core/users/users";
import { baseURL } from "@/shared/api/mutators/authMutator";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";

const imageUrl = (photo: FileResponse) => new URL(photo.url, baseURL).toString();

/** Личная галерея: собственная загрузка и удаление, независимо от аватара. */
export function ProfileGallery() {
  const { user, isLoading: userLoading } = useUser();
  const cache = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<FileResponse | null>(null);
  const [removing, setRemoving] = useState<FileResponse | null>(null);
  const queryKey = [...getUsersMyPhotosQueryKey(), user?.id];
  const gallery = useUsersMyPhotos({ query: { queryKey, enabled: Boolean(user?.id), retry: false } });
  const photos = gallery.data?.status === 200 ? gallery.data.data : [];

  const refreshPublicProfile = () => {
    if (user?.id) void cache.invalidateQueries({ queryKey: getUsersGetQueryKey(user.id) });
  };
  const upload = useUsersAddPhoto({ mutation: {
    onSuccess: (response) => {
      if (response.status === 200) {
        cache.setQueryData(queryKey, response);
        refreshPublicProfile();
        toast.success("Фото добавлено");
      }
    },
    onError: (error) => toast.error(error.detail ?? "Не удалось загрузить фото. Попробуй ещё раз."),
  } });
  const remove = useUsersRemovePhoto({ mutation: {
    onSuccess: (response) => {
      if (response.status === 200) {
        cache.setQueryData(queryKey, response);
        refreshPublicProfile();
        setRemoving(null);
        toast.success("Фото удалено");
      }
    },
    onError: (error) => toast.error(error.detail ?? "Не удалось удалить фото. Попробуй ещё раз."),
  } });
  const busy = upload.isPending || remove.isPending;

  const addFile = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Выбери фото в формате JPG, PNG или WebP");
      return;
    }
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      toast.error(file.size === 0 ? "Файл пустой" : "Фото должно быть не больше 5 МБ");
      return;
    }
    upload.mutate({ data: { file } });
  };

  return (
    <Card className="gap-4 p-5 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold lg:text-[22px]">Мои фото</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            До 6 фото · JPG, PNG, WebP до 5 МБ · видны в профиле
          </p>
        </div>
        {user && (
          <Button disabled={busy || gallery.isPending || gallery.isError || photos.length >= 6}
            onClick={() => input.current?.click()}>
            {upload.isPending ? "Загружаем…" : "Добавить фото"}
          </Button>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
          aria-label="Загрузить фото в галерею" disabled={busy}
          onChange={(event) => {
            addFile(event.target.files?.[0]);
            event.target.value = "";
          }} />
      </div>
      {userLoading || (user && gallery.isPending) ? (
        <p role="status" className="text-sm text-muted-foreground">Загружаем фотографии…</p>
      ) : !user ? (
        <p className="text-sm"><Link to="/auth/login" className="font-bold text-primary underline">Войди</Link>, чтобы добавить свои фотографии.</p>
      ) : gallery.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          Не удалось загрузить галерею.
          <Button variant="soft" onClick={() => void gallery.refetch()}>Повторить</Button>
        </div>
      ) : photos.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-track p-6 text-sm text-muted-foreground">
          Здесь будут твои фотографии с тренировок и встреч. Добавь первый снимок!
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {photos.map((photo, index) => (
            <div key={photo.id} className="flex min-w-0 flex-col gap-2">
              <button type="button" onClick={() => setPreview(photo)}
                aria-label={`Открыть фото ${index + 1}`}
                className="overflow-hidden rounded-2xl border-2 border-ink focus-visible:outline-2 focus-visible:outline-ring">
                <img src={imageUrl(photo)} alt={`Фото ${index + 1} из моей галереи`}
                  loading="lazy" className="aspect-square w-full object-cover" />
              </button>
              <Button variant="soft" disabled={busy} onClick={() => setRemoving(photo)}
                aria-label={`Удалить фото ${index + 1}`}>Удалить</Button>
            </div>
          ))}
        </div>
      )}
      <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogTitle>Фото из галереи</DialogTitle>
          <DialogDescription className="sr-only">{preview?.name}</DialogDescription>
          {preview && <img src={imageUrl(preview)} alt={preview.name} className="max-h-[75dvh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(removing)} onOpenChange={(open) => { if (!open && !remove.isPending) setRemoving(null); }}>
        <DialogContent>
          <DialogTitle>Удалить фото?</DialogTitle>
          <DialogDescription>Фотография исчезнет из твоей галереи.</DialogDescription>
          <div className="flex flex-wrap gap-3">
            <Button variant="soft" disabled={remove.isPending} onClick={() => setRemoving(null)}>Оставить</Button>
            <Button disabled={remove.isPending} onClick={() => removing && remove.mutate({ fileId: removing.id })}>
              {remove.isPending ? "Удаляем…" : "Удалить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
