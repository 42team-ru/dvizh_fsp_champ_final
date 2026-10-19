import { useState, type ReactNode } from "react";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { useQueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEY } from "@/entity/user/model/use-user";
import {
  getUsersMySportsQueryKey, useUsersDeleteAvatar, useUsersMySports, useUsersSaveMySports, useUsersUpdateMe,
  useUsersUploadAvatar,
} from "@/shared/api/generated/core/users/users";
import type { UserResponse, UserSportRequestLevel } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { SPORT_LEVEL_LABEL } from "@/shared/lib/statuses";
import { toast } from "@/shared/lib/toast";
import { SportPicker } from "@/features/sport-picker/ui/sport-picker";

type SportRow = { sportId?: string; name: string; level?: UserSportRequestLevel };

const field = "flex flex-col gap-1.5 text-sm font-bold";
const select = "h-10 rounded-xl border-2 border-ink bg-card px-2 text-sm";

/** Правка профиля: имя, город, о себе, аватар и виды спорта с уровнем. Сохраняет users_updateMe и users_saveMySports. */
export function EditProfileDialog({ user, children }: { user: UserResponse | undefined; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {open && user && <EditProfileForm user={user} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditProfileForm({ user, onDone }: { user: UserResponse; onDone(): void }) {
  const queryClient = useQueryClient();
  const mySports = useUsersMySports();
  const loaded = mySports.data?.status === 200 ? mySports.data.data : undefined;
  const [form, setForm] = useState({
    firstName: user.firstName ?? "", lastName: user.lastName ?? "", city: user.city ?? "", bio: user.bio ?? "",
  });
  const [sports, setSports] = useState<SportRow[] | null>(null);
  const rows = sports ?? loaded?.map((s) => ({ sportId: s.sport.id, name: s.sport.name, level: s.level })) ?? [];

  const updateMe = useUsersUpdateMe();
  const saveSports = useUsersSaveMySports();
  const uploadAvatar = useUsersUploadAvatar({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY }) } });
  const deleteAvatar = useUsersDeleteAvatar({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY }) } });
  const busy = updateMe.isPending || saveSports.isPending;
  const error = updateMe.error?.detail ?? saveSports.error?.detail ?? uploadAvatar.error?.detail;

  const submit = async () => {
    try {
      await updateMe.mutateAsync({ data: form });
      await saveSports.mutateAsync({ data: { sports: rows.map((r) => r.sportId
        ? { sportId: r.sportId, level: r.level } : { sportName: r.name, level: r.level }) } });
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
    <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <DialogHeader>
        <DialogTitle>Профиль</DialogTitle>
        <DialogDescription>Так вас видят организаторы и другие участники.</DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-3">
        <UserAvatar user={user} className="size-16 rounded-2xl border-2 border-ink object-cover" />
        <label className="inline-flex h-10 cursor-pointer items-center rounded-pill border-2 border-ink bg-card px-4 text-sm font-extrabold">
          {uploadAvatar.isPending ? "Загружаем…" : "Загрузить фото"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadAvatar.mutate({ data: { file } });
            }} />
        </label>
        {user.avatarUrl && <Button type="button" variant="ghost" size="sm" onClick={() => deleteAvatar.mutate()}>Убрать</Button>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className={field}>Имя
          <Input required minLength={2} maxLength={100} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        </label>
        <label className={field}>Фамилия
          <Input required minLength={2} maxLength={100} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </label>
      </div>
      <label className={field}>Город
        <Input maxLength={100} value={form.city} placeholder="Красноярск" onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </label>
      <label className={field}>О себе
        <textarea maxLength={1000} rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
          className="rounded-xl border-2 border-ink bg-card px-3 py-2 text-base" />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-bold">Виды спорта</legend>
        {rows.map((row, i) => (
          <div key={row.sportId ?? row.name} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-base font-bold">{row.name}</span>
            <select aria-label={`Уровень: ${row.name}`} className={select} value={row.level ?? ""}
              onChange={(e) => setSports(rows.map((r, j) => j === i ? { ...r, level: (e.target.value || undefined) as UserSportRequestLevel | undefined } : r))}>
              <option value="">Уровень не указан</option>
              {Object.entries(SPORT_LEVEL_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <Button type="button" variant="ghost" size="sm" aria-label={`Убрать ${row.name}`}
              onClick={() => setSports(rows.filter((_, j) => j !== i))}>✕</Button>
          </div>
        ))}
        <SportPicker placeholder="Добавить вид спорта" exclude={rows.flatMap((r) => r.sportId ? [r.sportId] : [])}
          onPick={(sport) => {
            if (!rows.some((r) => r.name.toLowerCase() === sport.name.toLowerCase())) setSports([...rows, sport]);
          }} />
      </fieldset>

      {error && <p role="alert" className="text-sm font-bold text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить"}</Button>
      </DialogFooter>
    </form>
  );
}
