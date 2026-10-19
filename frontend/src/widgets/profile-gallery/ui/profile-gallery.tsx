import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AlbumFolderResponse, FileResponse, UsersAlbumSort } from "@/shared/api/generated/core/appAPI.schemas";
import {
  getUsersGetQueryKey,
  getUsersMyPhotosQueryKey,
  useUsersAddPhoto,
  useUsersMyPhotos,
  useUsersRemovePhoto,
} from "@/shared/api/generated/core/users/users";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { cn } from "cn";
import { ABOUT_LIMIT, IMG, dateLong, fileProblem, foldersWord, imageUrl } from "../lib/gallery";
import { useAlbumFolders } from "../model/use-album";
import { AboutPhotos } from "./about-photos";
import { AddPhotoDialog } from "./add-photo-dialog";
import { AlbumFolders } from "./album-folders";
import { SortSelect } from "./album-grid";
import { AlbumPhotosView } from "./album-photos-view";
import { EmptyState, RoundButton, SportPill } from "./parts";
import type { GalleryOwner } from "./photo-viewer";

type Tab = "folders" | "all" | "about";

/**
 * Галерея профиля. «Папки» — занятия с фото, «Все фото» — лента с фильтром по спорту и сортировкой,
 * «Обо мне» — до шести личных фото. В своём профиле можно добавлять, подписывать и удалять; в чужом — только смотреть.
 * aboutPhotos — фото «Обо мне» чужого профиля (свои грузятся здесь).
 */
export function ProfileGallery({
  owner,
  mine,
  aboutPhotos = [],
  className,
}: {
  owner: GalleryOwner;
  mine: boolean;
  aboutPhotos?: FileResponse[];
  className?: string;
}) {
  const [tab, setTab] = useState<Tab>("folders");
  const [folder, setFolder] = useState<AlbumFolderResponse | null>(null);
  const [sportId, setSportId] = useState<string>();
  const [sort, setSort] = useState<UsersAlbumSort>("NEWEST");
  const [adding, setAdding] = useState<{ eventId?: string } | null>(null);
  const { query: foldersQuery, folders, total, sports } = useAlbumFolders(owner.id);
  const about = useAboutPhotos(owner.id, mine, aboutPhotos);
  const folderCounts = new Map(folders.map((f) => [f.event.id, f.photoCount]));

  const show = (next: Tab) => {
    setTab(next);
    setFolder(null);
  };
  const empty = mine ? (
    <EmptyState kind="mine" title="Здесь будут твои фото" text="Добавляй снимки с занятий — они сами разложатся по папкам.">
      <Button variant="secondary" className="mt-1 text-sm" onClick={() => setAdding({})}>
        <img src={`${IMG}/plus.svg`} alt="" className="size-4" />
        Добавить первое фото
      </Button>
    </EmptyState>
  ) : (
    <EmptyState kind="later" title="Нет фото" />
  );

  const action = !mine ? null : tab === "about" ? (
    <Button variant="secondary" disabled={about.full || about.busy} onClick={about.pick} className="text-sm">
      <img src={`${IMG}/plus.svg`} alt="" className="size-4" />
      Загрузить в «Обо мне»
    </Button>
  ) : (
    <Button variant="secondary" onClick={() => setAdding({ eventId: folder?.event.id })} className="text-sm">
      <img src={`${IMG}/plus.svg`} alt="" className="size-4" />
      {folder ? "Добавить в эту папку" : "Добавить фото"}
    </Button>
  );

  return (
    <section
      aria-label="Галерея"
      className={cn("flex flex-col gap-5 rounded-[24px] border-2 border-ink bg-card p-5 lg:p-7", className)}
    >
      {folder ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <RoundButton icon="chev-left" label="Назад к папкам" onClick={() => setFolder(null)} className="size-10" />
            <span className="hidden text-[13px] font-bold text-muted-foreground sm:inline">Галерея /</span>
            <h2 className="min-w-0 font-display text-lg leading-7 font-extrabold text-foreground lg:text-[22px]">
              {folder.event.title}
            </h2>
          </div>
          {action}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-[14px]">
            <h2 className="font-display text-[22px] leading-[30px] font-extrabold text-foreground lg:text-2xl">Галерея</h2>
            <span className="rounded-pill border-[1.5px] border-ink bg-lavender-soft px-3 py-[5px] text-xs font-extrabold whitespace-nowrap text-foreground">
              {total} фото · {folders.length} {foldersWord(folders.length)}
            </span>
          </div>
          {action}
        </div>
      )}

      {folder ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <SportPill sport={folder.event.sport} />
            <span className="text-[13px] font-extrabold text-foreground">{dateLong(folder.event.startAt)}</span>
            <span className="text-xs font-medium text-muted-foreground">
              {folder.photoCount} фото{mine ? " · все твои" : ""}
            </span>
            <Link
              to={`/events/${folder.event.id}`}
              className="flex items-center gap-[6px] rounded-pill border-[1.5px] border-ink bg-sky-soft px-3 py-1 text-xs font-extrabold text-foreground"
            >
              Открыть занятие
              <img src={`${IMG}/arrow.svg`} alt="" className="size-[10px]" />
            </Link>
          </div>
          <SortSelect value={sort} onChange={setSort} />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Разделы галереи" className="flex w-full gap-1 rounded-pill border-2 border-ink bg-card p-1 sm:w-auto">
            <TabButton active={tab === "folders"} count={folders.length} onClick={() => show("folders")}>Папки</TabButton>
            <TabButton active={tab === "all"} count={total} onClick={() => show("all")}>Все фото</TabButton>
            <TabButton active={tab === "about"} count={mine ? `${about.photos.length}/${ABOUT_LIMIT}` : about.photos.length}
              onClick={() => show("about")}>
              Обо мне
            </TabButton>
          </div>
          {tab === "folders" && <p className="text-xs font-semibold text-muted-foreground">Папка = занятие. Новые сверху</p>}
          {tab === "all" && <SortSelect value={sort} onChange={setSort} />}
        </div>
      )}

      {tab === "all" && !folder && sports.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Вид спорта">
          <SportChip active={!sportId} onClick={() => setSportId(undefined)}>Все виды</SportChip>
          {sports.map((s) => (
            <SportChip key={s.id} active={sportId === s.id} onClick={() => setSportId(s.id)}>
              {s.name}
            </SportChip>
          ))}
        </div>
      )}

      {folder ? (
        <AlbumPhotosView owner={owner} eventId={folder.event.id} sort={sort} dense folderCounts={folderCounts} empty={empty} />
      ) : tab === "all" ? (
        <AlbumPhotosView owner={owner} sportId={sportId} sort={sort} folderCounts={folderCounts} empty={empty} />
      ) : tab === "about" ? (
        about.photos.length === 0 && !mine ? (
          <EmptyState kind="later" title="Нет фото" />
        ) : (
          <AboutPhotos photos={about.photos} owner={mine} busy={about.busy} onAdd={about.pick}
            onOpen={about.setPreview} onRemove={about.setRemoving} />
        )
      ) : foldersQuery.isPending ? (
        <p role="status" className="py-6 text-center text-sm text-muted-foreground">Загружаем папки…</p>
      ) : foldersQuery.isError ? (
        <div role="alert" className="flex flex-wrap items-center justify-center gap-3 py-6 text-sm">
          Не удалось загрузить галерею.
          <Button variant="soft" onClick={() => void foldersQuery.refetch()}>Повторить</Button>
        </div>
      ) : folders.length === 0 ? (
        empty
      ) : (
        <AlbumFolders folders={folders} onOpen={setFolder} onAdd={mine ? () => setAdding({}) : undefined} />
      )}

      {mine && <AddPhotoDialog userId={owner.id} open={Boolean(adding)} eventId={adding?.eventId} onClose={() => setAdding(null)} />}
      {about.dialogs}
    </section>
  );
}

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: ReactNode;
  onClick(): void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-pill px-2 py-2 text-xs font-extrabold whitespace-nowrap transition-colors sm:flex-none sm:gap-2 sm:px-4 sm:text-[13px]",
        active ? "bg-primary text-white" : "text-foreground hover:bg-muted",
      )}
    >
      {children}
      <span
        className={cn(
          "rounded-pill px-[7px] py-px text-[11px] font-extrabold text-foreground",
          active ? "bg-secondary" : "bg-lavender-soft",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function SportChip({ active, onClick, children }: { active: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-pill border-[1.5px] border-ink px-[14px] py-[6px] text-xs font-extrabold transition-colors",
        active ? "bg-ink text-white" : "bg-card text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/** «Обо мне»: свои фото грузятся и меняются здесь, чужие приходят из публичного профиля. */
function useAboutPhotos(ownerId: string, mine: boolean, publicPhotos: FileResponse[]) {
  const cache = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<FileResponse | null>(null);
  const [removing, setRemoving] = useState<FileResponse | null>(null);
  const query = useUsersMyPhotos({ query: { enabled: mine, retry: false } });
  const own = query.data?.status === 200 ? query.data.data : [];
  const photos = mine ? own : publicPhotos;
  const update = (response: { status: number; data: unknown }) => {
    if (response.status !== 200) return;
    cache.setQueryData(getUsersMyPhotosQueryKey(), response);
    void cache.invalidateQueries({ queryKey: getUsersGetQueryKey(ownerId) });
  };
  const upload = useUsersAddPhoto({
    mutation: {
      onSuccess: (response) => {
        update(response);
        toast.success("Фото добавлено");
      },
      onError: (error) => toast.error(error.detail ?? "Не удалось загрузить фото. Попробуй ещё раз."),
    },
  });
  const remove = useUsersRemovePhoto({
    mutation: {
      onSuccess: (response) => {
        update(response);
        setRemoving(null);
        toast.success("Фото удалено");
      },
      onError: (error) => toast.error(error.detail ?? "Не удалось удалить фото. Попробуй ещё раз."),
    },
  });
  const busy = upload.isPending || remove.isPending;

  const dialogs = (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Загрузить фото в «Обо мне»"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const problem = fileProblem(file);
          if (problem) toast.error(problem);
          else upload.mutate({ data: { file } });
        }}
      />
      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="rounded-[24px] border-[2.5px] border-ink shadow-[8px_8px_0_var(--ink)] ring-0 sm:max-w-3xl">
          <DialogTitle>Фото «Обо мне»</DialogTitle>
          <DialogDescription className="sr-only">{preview?.name}</DialogDescription>
          {preview && <img src={imageUrl(preview.url)} alt={preview.name} className="max-h-[75dvh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(removing)} onOpenChange={(open) => !open && !remove.isPending && setRemoving(null)}>
        <DialogContent>
          <DialogTitle>Удалить фото?</DialogTitle>
          <DialogDescription>Фото исчезнет из «Обо мне».</DialogDescription>
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

  return {
    photos,
    busy,
    full: photos.length >= ABOUT_LIMIT,
    pick: () => input.current?.click(),
    setPreview,
    setRemoving,
    dialogs,
  };
}
