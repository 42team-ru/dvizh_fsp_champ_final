import { useEffect, useState } from "react";
import { Link } from "react-router";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import {
  getAlbumsEventsQueryKey, getAlbumsForEventQueryKey, getAlbumsListQueryKey, useAlbumsAdd, useAlbumsDelete,
  useAlbumsEligibleEvents, useAlbumsEvents, useAlbumsForEvent, useAlbumsList, useAlbumsUpdateCaption,
} from "@/shared/api/generated/core/albums/albums";
import type { AlbumPhotoResponse, AlbumsListSort } from "@/shared/api/generated/core/appAPI.schemas";
import { baseURL } from "@/shared/api/mutators/authMutator";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { toast } from "@/shared/lib/toast";
import { cn } from "cn";

const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const date = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const imageUrl = (photo: AlbumPhotoResponse) => new URL(photo.url, baseURL).toString();
const authorName = (p: AlbumPhotoResponse) => [p.author.firstName, p.author.lastName].filter(Boolean).join(" ") || p.author.username;

const SORTS: { value: AlbumsListSort; label: string }[] = [
  { value: "NEWEST", label: "Сначала новые" },
  { value: "OLDEST", label: "Сначала старые" },
  { value: "EVENT_NEWEST", label: "По дате встречи: последние" },
  { value: "EVENT_OLDEST", label: "По дате встречи: первые" },
];
const STEP = 30;
const select = "h-10 rounded-xl border-2 border-ink bg-card px-3 text-sm font-bold";

/** Сетка фото: подпись встречи под каждым, клик открывает просмотр. */
function Grid({ photos, onOpen, showEvent }: { photos: AlbumPhotoResponse[]; onOpen(index: number): void; showEvent: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((p, i) => (
        <li key={p.id}>
          <button type="button" onClick={() => onOpen(i)}
            className="group block w-full overflow-hidden rounded-2xl border-2 border-ink bg-card text-left shadow-hard-sm focus-visible:outline-3 focus-visible:outline-ink">
            <img src={imageUrl(p)} alt={p.caption ?? p.event.title} loading="lazy"
              className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.03]" />
            <span className="block border-t-2 border-ink px-3 py-2">
              {showEvent && <span className="block truncate text-sm font-extrabold">{p.event.title}</span>}
              <span className="block truncate text-xs font-semibold text-muted-foreground">
                {showEvent ? `${p.event.sport.name} · ${date(p.event.startAt)}` : authorName(p)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Просмотр фото во весь размер: листание стрелками, подпись; у своих фото — правка подписи и удаление. */
function Lightbox({ photos, index, onIndex, onChanged }: {
  photos: AlbumPhotoResponse[];
  index: number | null;
  onIndex(index: number | null): void;
  onChanged(): void;
}) {
  const photo = index == null ? undefined : photos[index];
  const [caption, setCaption] = useState("");
  useEffect(() => setCaption(photo?.caption ?? ""), [photo?.id, photo?.caption]);
  useEffect(() => {
    if (index == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && index < photos.length - 1) onIndex(index + 1);
      if (event.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onIndex]);
  const update = useAlbumsUpdateCaption({ mutation: { onSuccess: () => { toast.success("Подпись сохранена"); onChanged(); } } });
  const remove = useAlbumsDelete({ mutation: { onSuccess: () => { toast.success("Фото удалено"); onIndex(null); onChanged(); } } });

  return (
    <Dialog open={photo != null} onOpenChange={(open) => !open && onIndex(null)}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-3xl">
        {photo && (
          <div className="flex flex-col gap-3">
            <DialogTitle className="pr-8">
              <Link to={`/events/${photo.event.id}`} className="underline-offset-4 hover:underline">{photo.event.title}</Link>
            </DialogTitle>
            <DialogDescription>
              {photo.event.sport.name} · {date(photo.event.startAt)} · добавил{" "}
              <Link to={`/users/${photo.author.id}`} className="font-bold underline-offset-4 hover:underline">{authorName(photo)}</Link>
            </DialogDescription>
            <div className="relative">
              <img src={imageUrl(photo)} alt={photo.caption ?? photo.event.title} className="max-h-[62dvh] w-full rounded-2xl border-2 border-ink bg-muted object-contain" />
              {index! > 0 && (
                <Button type="button" size="icon-sm" variant="soft" aria-label="Предыдущее фото" className="absolute top-1/2 left-2 -translate-y-1/2"
                  onClick={() => onIndex(index! - 1)}>‹</Button>
              )}
              {index! < photos.length - 1 && (
                <Button type="button" size="icon-sm" variant="soft" aria-label="Следующее фото" className="absolute top-1/2 right-2 -translate-y-1/2"
                  onClick={() => onIndex(index! + 1)}>›</Button>
              )}
            </div>
            <p className="text-center text-xs font-bold text-muted-foreground">{index! + 1} из {photos.length}</p>
            {photo.mine ? (
              <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); update.mutate({ photoId: photo.id, data: { caption } }); }}>
                <Input value={caption} maxLength={300} placeholder="Подпись к фото" aria-label="Подпись" className="min-w-0 flex-1"
                  onChange={(e) => setCaption(e.target.value)} />
                <Button type="submit" size="sm" disabled={update.isPending || caption === (photo.caption ?? "")}>Сохранить</Button>
                <Button type="button" size="sm" variant="destructive" disabled={remove.isPending}
                  onClick={() => { if (window.confirm("Удалить фото из альбома?")) remove.mutate({ photoId: photo.id }); }}>Удалить</Button>
              </form>
            ) : (
              photo.caption && <p className="text-base font-semibold">{photo.caption}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Загрузка фото в свой альбом: к какой встрече, подпись, файл. eventId задан — встреча уже выбрана (карточка события). */
function Upload({ eventId, onDone }: { eventId?: string; onDone(): void }) {
  const eligible = useAlbumsEligibleEvents({ query: { enabled: !eventId } });
  const events = eligible.data?.status === 200 ? eligible.data.data : [];
  const [selected, setSelected] = useState(eventId ?? "");
  const [caption, setCaption] = useState("");
  const add = useAlbumsAdd();
  const [busy, setBusy] = useState(false);
  const target = eventId ?? selected;

  const upload = async (files: FileList | null) => {
    if (!files?.length || !target) return;
    setBusy(true);
    let ok = 0;
    // По одному: у каждого фото свой ответ и своя ошибка (формат, размер, лимит альбома).
    for (const file of Array.from(files)) {
      try {
        await add.mutateAsync({ params: { eventId: target, caption: caption || undefined }, data: { file } });
        ok++;
      } catch (error) {
        toast.error(`«${file.name}» не загружено`, { description: (error as { detail?: string }).detail ?? "Попробуйте ещё раз" });
      }
    }
    setBusy(false);
    if (ok) {
      toast.success(ok === 1 ? "Фото добавлено" : `Добавлено фото: ${ok}`);
      setCaption("");
      onDone();
    }
  };

  if (!eventId && eligible.isSuccess && events.length === 0) {
    return <p className="text-sm font-semibold text-muted-foreground">Фото можно добавлять к встречам, где вы участник или организатор. Запишитесь на событие — и альбом откроется.</p>;
  }
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-2xl border-2 border-dashed border-ink p-3">
      {!eventId && (
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm font-bold">
          С какой встречи
          <select className={select} value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Выберите встречу</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title} · {date(e.startAt)}</option>)}
          </select>
        </label>
      )}
      <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm font-bold">
        Подпись (необязательно)
        <Input value={caption} maxLength={300} placeholder="Финиш у моста" onChange={(e) => setCaption(e.target.value)} />
      </label>
      <label className={cn(
        "inline-flex h-10 cursor-pointer items-center rounded-pill border-2 border-ink bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-hard-sm",
        (!target || busy) && "pointer-events-none opacity-50",
      )}>
        {busy ? "Загружаем…" : "Загрузить фото"}
        <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={!target || busy}
          onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
      </label>
    </div>
  );
}

/**
 * Альбом человека: фото с его встреч, фильтр по встрече, четыре порядка, просмотр.
 * editable — свой альбом: загрузка, подписи, удаление. Чужой — только смотреть.
 */
export function UserAlbum({ userId, editable, className }: { userId: string; editable: boolean; className?: string }) {
  const cache = useQueryClient();
  const [eventId, setEventId] = useState<string>("");
  const [sort, setSort] = useState<AlbumsListSort>("NEWEST");
  const [size, setSize] = useState(STEP);
  const [open, setOpen] = useState<number | null>(null);
  const params = { eventId: eventId || undefined, sort, page: 0, size };
  const list = useAlbumsList(userId, params, { query: { placeholderData: keepPreviousData } });
  const eventsQuery = useAlbumsEvents(userId);
  const page = list.data?.status === 200 ? list.data.data : undefined;
  const photos = page?.items ?? [];
  const events = eventsQuery.data?.status === 200 ? eventsQuery.data.data : [];
  const total = events.reduce((sum, e) => sum + e.photosCount, 0);
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: getAlbumsListQueryKey(userId) });
    void cache.invalidateQueries({ queryKey: getAlbumsEventsQueryKey(userId) });
  };

  return (
    <Card className={cn("gap-4 rounded-[28px] p-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[22px] leading-[27px] font-bold">Альбом</h2>
        <span className="text-[13px] font-bold text-muted-foreground">{total} фото · {events.length} встреч</span>
      </div>
      {editable && <Upload onDone={refresh} />}
      {events.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Встреча">
            <Button type="button" size="chip" role="tab" aria-selected={!eventId} variant={!eventId ? "ink" : "soft"}
              className="shrink-0" onClick={() => { setEventId(""); setSize(STEP); }}>Все</Button>
            {events.map((e) => (
              <Button key={e.id} type="button" size="chip" role="tab" aria-selected={eventId === e.id}
                variant={eventId === e.id ? "ink" : "soft"} className="max-w-[260px] shrink-0"
                onClick={() => { setEventId(e.id); setSize(STEP); }}>
                <span className="truncate">{e.title}</span> · {e.photosCount}
              </Button>
            ))}
          </div>
          <select aria-label="Порядок" className={select} value={sort} onChange={(e) => setSort(e.target.value as AlbumsListSort)}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}
      {list.isPending && <p className="text-sm font-semibold text-muted-foreground">Загружаем альбом…</p>}
      {list.isError && <p role="alert" className="text-sm font-semibold text-destructive">Не удалось загрузить альбом.</p>}
      {page && photos.length === 0 && (
        <p className="text-sm font-semibold text-muted-foreground">
          {editable ? "В альбоме пока пусто. Добавьте фото со своих встреч." : "В альбоме пока пусто."}
        </p>
      )}
      <Grid photos={photos} onOpen={setOpen} showEvent />
      {page && (page.totalElements ?? 0) > photos.length && size < 100 && (
        <Button type="button" variant="soft" className="self-center" onClick={() => setSize(Math.min(100, size + STEP))}>
          Показать ещё
        </Button>
      )}
      <Lightbox photos={photos} index={open} onIndex={setOpen} onChanged={refresh} />
    </Card>
  );
}

/** Фото участников с одной встречи; canAdd — я участник или организатор и могу добавить свои. */
export function EventAlbum({ eventId, canAdd, className }: { eventId: string; canAdd: boolean; className?: string }) {
  const cache = useQueryClient();
  const [open, setOpen] = useState<number | null>(null);
  const query = useAlbumsForEvent(eventId);
  const photos = query.data?.status === 200 ? query.data.data : [];
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: getAlbumsForEventQueryKey(eventId) });
    // Мой альбом в профиле тоже обновится: любые запросы альбомов людей.
    void cache.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes("/album") });
  };
  if (!canAdd && query.isSuccess && photos.length === 0) return null;
  return (
    <Card className={cn("gap-4 rounded-[28px] p-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[22px] leading-[27px] font-bold">Фото с встречи</h2>
        <span className="text-[13px] font-bold text-muted-foreground">{photos.length} фото</span>
      </div>
      {canAdd && <Upload eventId={eventId} onDone={refresh} />}
      {photos.length === 0 && <p className="text-sm font-semibold text-muted-foreground">Пока никто не добавил фото — будьте первым.</p>}
      <Grid photos={photos} onOpen={setOpen} showEvent={false} />
      <Lightbox photos={photos} index={open} onIndex={setOpen} onChanged={refresh} />
    </Card>
  );
}
