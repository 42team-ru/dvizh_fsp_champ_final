import { useId, useState, type ReactNode } from "react";
import { Camera, Trash2, X } from "lucide-react";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { useQueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEY } from "@/entity/user/model/use-user";
import {
  getUsersMyPreferencesQueryKey, getUsersMySportsQueryKey, useUsersDeleteAvatar, useUsersMyPreferences, useUsersMySports,
  useUsersSaveMyPreferences, useUsersSaveMySports, useUsersUpdateMe, useUsersUploadAvatar,
} from "@/shared/api/generated/core/users/users";
import type { UserResponse, UserSportRequestLevel } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { SPORT_LEVEL_LABEL } from "@/shared/lib/statuses";
import { toast } from "@/shared/lib/toast";
import { SportPicker } from "@/features/sport-picker/ui/sport-picker";
import { HomeLocationField } from "@/features/home-location/ui/home-location-field";

type SportRow = { sportId?: string; name: string; level?: UserSportRequestLevel };

const BIO_MAX = 1000;
const label = "text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground";
const input =
  "w-full rounded-[14px] border-2 border-ink bg-card px-4 py-3 text-base font-bold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground focus:border-primary focus:ring-[3px] focus:ring-ring/40";
const select =
  "h-11 min-w-0 rounded-[12px] border-2 border-ink bg-card px-2 text-sm font-bold outline-none focus:border-primary";
const TONES = ["bg-sky-soft", "bg-lime-soft", "bg-peach", "bg-lavender-soft"];

/**
 * Правка профиля: имя, город, о себе, аватар, домашняя точка и виды спорта с уровнем.
 * Сохраняет users_updateMe, users_saveMySports и, если дом меняли, users_saveMyPreferences.
 */
export function EditProfileDialog({ user, children }: { user: UserResponse | undefined; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-[24px] border-[2.5px] border-ink p-0 shadow-[8px_8px_0_var(--ink)] ring-0 sm:max-w-[620px]"
      >
        <DialogTitle className="sr-only">Профиль</DialogTitle>
        <DialogDescription className="sr-only">Имя, город, о себе, фото, дом и виды спорта</DialogDescription>
        {open && user && <EditProfileForm user={user} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditProfileForm({ user, onDone }: { user: UserResponse; onDone(): void }) {
  const queryClient = useQueryClient();
  const ids = { first: useId(), last: useId(), city: useId(), bio: useId(), home: useId() };
  const mySports = useUsersMySports();
  const loaded = mySports.data?.status === 200 ? mySports.data.data : undefined;
  const [form, setForm] = useState({
    firstName: user.firstName ?? "", lastName: user.lastName ?? "", city: user.city ?? "", bio: user.bio ?? "",
  });
  const [sports, setSports] = useState<SportRow[] | null>(null);
  const rows = sports ?? loaded?.map((s) => ({ sportId: s.sport.id, name: s.sport.name, level: s.level })) ?? [];
  const myPreferences = useUsersMyPreferences();
  const preferences = myPreferences.data?.status === 200 ? myPreferences.data.data : undefined;
  /** undefined — дом не трогали, PUT предпочтений не нужен. */
  const [home, setHome] = useState<[number, number] | null | undefined>(undefined);
  const savedHome: [number, number] | null = preferences?.home ? [preferences.home.lon, preferences.home.lat] : null;

  const updateMe = useUsersUpdateMe();
  const saveSports = useUsersSaveMySports();
  const savePreferences = useUsersSaveMyPreferences();
  const uploadAvatar = useUsersUploadAvatar({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY }) } });
  const deleteAvatar = useUsersDeleteAvatar({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY }) } });
  const busy = updateMe.isPending || saveSports.isPending || savePreferences.isPending;
  const error = updateMe.error?.detail ?? saveSports.error?.detail ?? savePreferences.error?.detail ?? uploadAvatar.error?.detail;

  const submit = async () => {
    try {
      await updateMe.mutateAsync({ data: form });
      await saveSports.mutateAsync({ data: { sports: rows.map((r) => r.sportId
        ? { sportId: r.sportId, level: r.level } : { sportName: r.name, level: r.level }) } });
      // PUT заменяет предпочтения целиком: остальные поля берём из загруженных, меняем только дом.
      if (preferences && home !== undefined) {
        const { home: _, ...rest } = preferences;
        await savePreferences.mutateAsync({ data: { ...rest, home: home ? { lon: home[0], lat: home[1] } : undefined } });
        await queryClient.invalidateQueries({ queryKey: getUsersMyPreferencesQueryKey() });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: getUsersMySportsQueryKey() }),
      ]);
      toast.success("Профиль сохранён");
      onDone();
    } catch {
      // текст ошибки показывается под формой
    }
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      aria-busy={busy}
      onSubmit={(event) => { event.preventDefault(); void submit(); }}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 sm:px-7 sm:pt-7">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-extrabold tracking-[2px] text-primary">ПРОФИЛЬ</span>
          <h2 className="font-display text-[22px] leading-7 font-extrabold text-foreground">Редактирование</h2>
          <p className="text-sm font-medium text-muted-foreground">Так вас видят организаторы и другие участники.</p>
        </div>
        <button
          type="button"
          aria-label="Закрыть"
          onClick={onDone}
          className="flex size-10 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pt-1 pb-5 sm:px-7">
        <section aria-label="Фото профиля" className="flex items-center gap-4 rounded-[18px] border-2 border-ink bg-sky-soft p-4">
          <UserAvatar user={user} className="size-20 shrink-0 rounded-2xl border-2 border-ink object-cover" />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-pill border-2 border-ink bg-card px-4 text-sm font-extrabold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
              <Camera className="size-4" />
              {uploadAvatar.isPending ? "Загружаем…" : user.avatarUrl ? "Заменить фото" : "Загрузить фото"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadAvatar.mutate({ data: { file } });
                }} />
            </label>
            {user.avatarUrl && (
              <Button type="button" variant="outline" className="h-11 gap-2 px-4 text-sm" disabled={deleteAvatar.isPending}
                onClick={() => deleteAvatar.mutate()}>
                <Trash2 className="size-4" />
                Убрать
              </Button>
            )}
            <p className="w-full text-xs font-medium text-muted-foreground">JPG, PNG или WebP</p>
          </div>
        </section>

        <section aria-label="Основное" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor={ids.first} className={label}>ИМЯ</label>
              <input id={ids.first} required minLength={2} maxLength={100} value={form.firstName} className={input}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor={ids.last} className={label}>ФАМИЛИЯ</label>
              <input id={ids.last} required minLength={2} maxLength={100} value={form.lastName} className={input}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.city} className={label}>ГОРОД</label>
            <input id={ids.city} maxLength={100} value={form.city} placeholder="Красноярск" className={input}
              onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor={ids.bio} className={label}>О СЕБЕ</label>
              <span className="text-[11px] font-bold text-muted-foreground">{form.bio.length} / {BIO_MAX}</span>
            </div>
            <textarea id={ids.bio} maxLength={BIO_MAX} rows={3} value={form.bio} className={`${input} resize-none`}
              placeholder="Чем занимаешься и что ищешь"
              onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
        </section>

        {preferences && (
          <section aria-labelledby={ids.home} className="flex flex-col gap-2">
            <span id={ids.home} className={label}>ДОМ — ДЛЯ ПОДБОРА ВСТРЕЧ РЯДОМ</span>
            <HomeLocationField value={home === undefined ? savedHome : home} onChange={setHome} />
          </section>
        )}

        <fieldset className="flex flex-col gap-3">
          <legend className={`${label} mb-1`}>ВИДЫ СПОРТА И УРОВЕНЬ</legend>
          {rows.length === 0 && <p className="text-sm font-medium text-muted-foreground">Пока ничего не выбрано.</p>}
          {rows.map((row, i) => (
            <div key={row.sportId ?? row.name}
              className={`flex items-center gap-2 rounded-[14px] border-2 border-ink p-2 pl-4 ${TONES[i % TONES.length]}`}>
              <span className="min-w-0 flex-1 truncate text-base font-extrabold">{row.name}</span>
              <select aria-label={`Уровень: ${row.name}`} className={`${select} w-[150px] sm:w-[190px]`} value={row.level ?? ""}
                onChange={(e) => setSports(rows.map((r, j) => j === i ? { ...r, level: (e.target.value || undefined) as UserSportRequestLevel | undefined } : r))}>
                <option value="">Уровень не указан</option>
                {Object.entries(SPORT_LEVEL_LABEL).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </select>
              <button type="button" aria-label={`Убрать ${row.name}`}
                onClick={() => setSports(rows.filter((_, j) => j !== i))}
                className="flex size-11 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-card focus-visible:outline-2 focus-visible:outline-ring">
                <X className="size-4" />
              </button>
            </div>
          ))}
          <SportPicker placeholder="Добавить вид спорта" exclude={rows.flatMap((r) => r.sportId ? [r.sportId] : [])}
            onPick={(sport) => {
              if (!rows.some((r) => r.name.toLowerCase() === sport.name.toLowerCase())) setSports([...rows, sport]);
            }} />
        </fieldset>

        {error && <p role="alert" className="text-sm font-bold text-destructive">{error}</p>}
      </div>

      <div className="flex items-center justify-end gap-[10px] border-t-2 border-ink bg-card px-5 py-4 sm:px-7">
        <Button type="button" variant="outline" disabled={busy} onClick={onDone} className="h-12 px-[22px] text-sm">Отмена</Button>
        <Button type="submit" disabled={busy} className="h-12 px-[26px] text-sm">{busy ? "Сохраняем…" : "Сохранить"}</Button>
      </div>
    </form>
  );
}
