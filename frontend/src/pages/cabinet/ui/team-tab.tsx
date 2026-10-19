import { useRef, useState, type FormEvent } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import {
  useEventsAddOrganizer,
  useEventsAddPhoto,
  useEventsRemoveOrganizer,
  useEventsRemovePhoto,
} from "@/shared/api/generated/core/events/events";
import { Button } from "@/shared/components/ui/button";
import { toast } from "@/shared/lib/toast";
import type { ManagedEvent } from "../model/use-manage-event";
import { Avatar, Chip, Divider, inputClass, OrangeButton, PersonLine, Warning } from "./parts";

const MAX_PHOTOS = 6;
const card = "flex w-full flex-col gap-3 rounded-[24px] border-2 border-ink bg-card p-5 sm:p-6";

/** Организаторы: автор и соорганизаторы. Состав меняет только автор (`canManageOrganizers`). */
export function TeamTab({ event, refresh }: { event: ManagedEvent; refresh: () => Promise<unknown> }) {
  const [login, setLogin] = useState("");
  const add = useEventsAddOrganizer();
  const remove = useEventsRemoveOrganizer();
  const canEdit = event.viewer.canManageOrganizers;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!login.trim()) return;
    add.mutate(
      { id: event.id, data: { login: login.trim() } },
      { onSuccess: () => (toast.success("Соорганизатор добавлен"), setLogin(""), void refresh()) },
    );
  };

  return (
    <section className={card}>
      <h2 className="font-display text-xl font-extrabold text-foreground">Организаторы</h2>
      <p className="text-[13px] leading-[18px] font-medium text-muted-foreground">
        Соорганизатор правит мероприятие и решает заявки наравне с автором. Состав меняет только автор.
      </p>
      {event.organizers.map((o) => (
        <div key={o.user.id} className="flex flex-wrap items-center gap-3 rounded-[14px] border-[1.5px] border-ink bg-card px-3 py-2.5">
          <Avatar user={o.user} className="size-10" />
          <div className="min-w-0 flex-1">
            <PersonLine user={o.user} extra={o.organization?.name ?? ""} />
          </div>
          {o.author ? (
            <Chip tone="bg-secondary">Автор</Chip>
          ) : (
            <>
              <Chip>Соорганизатор</Chip>
              {canEdit && (
                <OrangeButton
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate({ id: event.id, userId: o.user.id }, { onSuccess: () => (toast.success("Соорганизатор убран"), void refresh()) })
                  }
                >
                  Убрать
                </OrangeButton>
              )}
            </>
          )}
        </div>
      ))}
      {remove.error?.detail && <Warning className="py-2">{remove.error.detail}</Warning>}

      {canEdit ? (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <Divider>Добавить соорганизатора</Divider>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Логин или email"
              aria-label="Логин или email соорганизатора"
              className={`${inputClass} sm:max-w-[320px]`}
            />
            <Button type="submit" disabled={add.isPending || !login.trim()}>Добавить</Button>
          </div>
          {add.error?.detail && <Warning className="py-2">{add.error.detail}</Warning>}
        </form>
      ) : (
        <p className="rounded-[12px] bg-lavender-soft px-3 py-2.5 text-[13px] leading-[18px] font-medium text-muted-foreground">
          Вы соорганизатор: менять состав может только автор, остальное вам доступно.
        </p>
      )}
    </section>
  );
}

/** Фото мероприятия: до шести, первое — обложка в ленте. */
export function PhotosTab({ event, refresh }: { event: ManagedEvent; refresh: () => Promise<unknown> }) {
  const input = useRef<HTMLInputElement>(null);
  const add = useEventsAddPhoto();
  const remove = useEventsRemovePhoto();
  const photos = event.photos;
  const empty = Math.max(0, MAX_PHOTOS - photos.length - 1);

  const upload = (file?: File) => {
    if (!file) return;
    add.mutate({ id: event.id, data: { file } }, { onSuccess: () => (toast.success("Фото добавлено"), void refresh()) });
  };

  return (
    <section className={card}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold text-foreground">Фото</h2>
        <Chip tone="bg-lavender-soft" className="normal-case">{photos.length} из {MAX_PHOTOS}</Chip>
      </div>
      <p className="text-[13px] leading-[18px] font-medium text-muted-foreground">
        Первое фото — обложка в ленте. Новые добавляются в конец; JPG, PNG, WebP до 5 МБ.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((p, i) => (
          <div key={p.id} className="relative aspect-[6/5] overflow-hidden rounded-[14px] border-2 border-ink bg-sky">
            <img src={p.url} alt={p.name} className="size-full object-cover" />
            {i === 0 && (
              <span className="absolute top-1.5 left-1.5 rounded-pill border-[1.5px] border-ink bg-secondary px-2 py-0.5 text-[10px] font-extrabold tracking-[1px] text-foreground">
                ОБЛОЖКА
              </span>
            )}
            <button
              type="button"
              aria-label="Удалить фото"
              disabled={remove.isPending}
              onClick={() => remove.mutate({ id: event.id, fileId: p.id }, { onSuccess: () => void refresh() })}
              className="absolute top-1.5 right-1.5 flex size-[30px] items-center justify-center rounded-full border-[1.5px] border-ink bg-card hover:bg-peach"
            >
              <X className="size-3.5" strokeWidth={3} />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={add.isPending}
            className="flex aspect-[6/5] flex-col items-center justify-center gap-1.5 rounded-[14px] border-[2.5px] border-dashed border-primary bg-lime-soft text-sm font-extrabold text-foreground hover:bg-secondary disabled:opacity-60"
          >
            {add.isPending ? <ImagePlus className="size-5 animate-pulse" /> : <Plus className="size-5 text-primary" strokeWidth={2.6} />}
            {add.isPending ? "Загружаем…" : "Добавить"}
          </button>
        )}
        {Array.from({ length: empty }, (_, i) => (
          <div key={i} className="hidden aspect-[6/5] items-center justify-center rounded-[14px] border-[2.5px] border-dashed border-track sm:flex">
            <Plus className="size-5 text-track" strokeWidth={2.6} />
          </div>
        ))}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {(add.error?.detail || remove.error?.detail) && <Warning className="py-2">{add.error?.detail ?? remove.error?.detail}</Warning>}
      <p className="text-xs leading-4 font-medium text-muted-foreground">
        Порядок не меняется: чтобы сменить обложку, удалите первое фото — обложкой станет следующее.
      </p>
    </section>
  );
}
