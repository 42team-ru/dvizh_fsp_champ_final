import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { Bell, Check, Home, LocateFixed, Map as MapIcon, Plus, PartyPopper, Search, Shuffle, Upload, X } from "lucide-react";
import type {
  MeResponse, PetCatalogResponse, SaveUserPreferencesRequest, ShopItemResponse, UserSportRequestLevel,
} from "@/shared/api/generated/core/appAPI.schemas";
import { useSportsSearch } from "@/shared/api/generated/core/sports/sports";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { SPORT_LEVEL_LABEL } from "@/shared/lib/statuses";
import { BeaverPet, type BeaverMood, type BeaverPetHandle } from "@/widgets/beaver-pet/ui/beaver-pet";
import { BeaverItemPreview } from "@/widgets/beaver-pet/ui/beaver-item-preview";
import type { BeaverActivity, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";
import { LocationPicker } from "@/widgets/events-map/ui/location-picker";
import { cn } from "cn";

export type SportRow = { sportId?: string; name: string; level?: UserSportRequestLevel };
export type Profile = { firstName: string; lastName: string; city: string; bio: string };
export type Prefs = Omit<SaveUserPreferencesRequest, "radiusKm">;
export type Pet = { name: string; outfit: Record<string, string>; activity: string };

export const BIO_MAX = 1000;
export const PET_NAME_MAX = 20;
export const SPORTS_MAX = 30;
const ACTIVITY = "activity";
const NONE = "none";

const label = "text-[11px] font-extrabold tracking-[1.5px] text-foreground";
const input =
  "w-full rounded-[14px] border-2 border-ink bg-card px-4 py-3 text-base font-bold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground focus:border-primary focus:ring-[3px] focus:ring-ring/40";
const card = "rounded-[22px] border-2 border-ink bg-card";

export function Heading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-[28px] leading-[1.05] font-extrabold tracking-[-0.5px] text-foreground lg:text-[38px]">
        {title}
      </h1>
      <p className="text-[15px] font-medium text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Живой бобр с репликой: машет при появлении, а при смене реплики снова реагирует. */
export function TalkingBeaver({
  say, mood = "happy", outfit, activity, className, beaverClassName,
}: {
  say?: string;
  mood?: BeaverMood;
  outfit?: Record<string, string>;
  activity?: string;
  className?: string;
  beaverClassName?: string;
}) {
  const beaver = useRef<BeaverPetHandle>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => beaver.current?.react(mood, { ms: 1400, wave: true }), 400);
    return () => window.clearTimeout(timer);
  }, [say, mood]);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BeaverPet
        ref={beaver}
        mood={mood}
        outfit={outfit as BeaverOutfit | undefined}
        activity={activity as BeaverActivity | undefined}
        className={cn("shrink-0 [&_.beaver-speech]:hidden", beaverClassName ?? "h-[170px] w-[150px] [&_svg]:h-full")}
      />
      {say && (
        <p className="rounded-[18px] border-2 border-ink bg-card px-4 py-3 text-sm leading-5 font-bold text-foreground shadow-[4px_4px_0_var(--lime)]">
          {say}
        </p>
      )}
    </div>
  );
}

/* ---------- 1. О себе ---------- */

export function StepProfile({
  user, profile, setProfile, onUpload, uploading,
}: {
  user: MeResponse;
  profile: Profile;
  setProfile(p: Profile): void;
  onUpload(file: File): void;
  uploading: boolean;
}) {
  const ids = { first: useId(), last: useId(), city: useId(), bio: useId() };
  const preview = { ...user, firstName: profile.firstName, lastName: profile.lastName };
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      <div className="flex flex-col gap-5">
        <Heading title="Расскажи о себе" hint="Имя и город видят все. По городу подберём события, даже если не дашь доступ к геолокации." />
        <section className={cn(card, "flex items-center gap-5 p-5")}>
          <UserAvatar user={preview} className="size-24 shrink-0 rounded-full border-2 border-ink bg-sky object-cover" />
          <div className="flex flex-col gap-2">
            <p className="font-display text-lg font-bold">Фото профиля</p>
            <p className="text-xs font-medium text-muted-foreground">JPG, PNG или WebP до 5 МБ. Без фото покажем инициалы.</p>
            <label className="inline-flex h-11 w-fit cursor-pointer items-center gap-2 rounded-pill border-2 border-ink bg-ink px-4 text-sm font-extrabold text-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
              <Upload className="size-4" />
              {uploading ? "Загружаем…" : user.avatarUrl ? "Заменить фото" : "Загрузить фото"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            </label>
          </div>
        </section>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.first} className={label}>ИМЯ *</label>
            <input id={ids.first} maxLength={100} value={profile.firstName} className={input}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
            <span className="text-xs text-muted-foreground">От 2 до 100 символов</span>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.last} className={label}>ФАМИЛИЯ *</label>
            <input id={ids.last} maxLength={100} value={profile.lastName} className={input}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.city} className={label}>ГОРОД</label>
          <input id={ids.city} maxLength={100} value={profile.city} placeholder="Красноярск" className={input}
            onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.bio} className={label}>О СЕБЕ</label>
          <textarea id={ids.bio} maxLength={BIO_MAX} rows={3} value={profile.bio} className={cn(input, "resize-none")}
            placeholder="Чем занимаешься и что ищешь"
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
          <span className="text-xs text-muted-foreground">{profile.bio.length} / {BIO_MAX}</span>
        </div>
      </div>
      <aside className="flex flex-col gap-4">
        <p className={label}>ТАК ТЕБЯ УВИДЯТ</p>
        <div className={cn(card, "flex flex-col gap-3 p-5 shadow-[6px_6px_0_var(--primary)]")}>
          <div className="flex items-center gap-3">
            <UserAvatar user={preview} className="size-14 rounded-full border-2 border-ink bg-sky object-cover" />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">{`${profile.firstName} ${profile.lastName}`.trim() || "Имя Фамилия"}</p>
              <p className="truncate text-sm text-muted-foreground">@{user.username}{profile.city.trim() && ` · ${profile.city.trim()}`}</p>
            </div>
          </div>
          {profile.bio.trim() && <p className="text-sm font-medium">{profile.bio.trim()}</p>}
          <span className="w-fit rounded-pill border-[1.5px] border-ink bg-lavender-soft px-3 py-1 text-[11px] font-bold">виды спорта — на следующем шаге</span>
        </div>
        <TalkingBeaver mood="thinking" say="Город поможет, если не захочешь делиться геолокацией." />
      </aside>
    </div>
  );
}

/* ---------- 2. Виды спорта ---------- */

const LEVEL_OPTIONS: (UserSportRequestLevel | undefined)[] = [undefined, "BEGINNER", "AMATEUR", "PRO"];

export function StepSports({ sports, setSports }: { sports: SportRow[]; setSports(s: SportRow[]): void }) {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(text.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [text]);
  const catalog = useSportsSearch(undefined, { query: { staleTime: 5 * 60_000 } });
  const search = useSportsSearch({ query }, { query: { enabled: query.length > 0, placeholderData: keepPreviousData } });
  const all = catalog.data?.status === 200 ? catalog.data.data : [];
  const tiles = all.filter((s) => !s.custom).slice(0, 8);
  const found = query && search.data?.status === 200 ? search.data.data.slice(0, 6) : [];
  const [custom, setCustom] = useState("");

  const has = (s: { sportId?: string; name: string }) =>
    sports.some((r) => (s.sportId && r.sportId === s.sportId) || r.name.toLowerCase() === s.name.toLowerCase());
  const add = (s: SportRow) => { if (!has(s) && sports.length < SPORTS_MAX) setSports([...sports, s]); };
  const remove = (s: SportRow) => setSports(sports.filter((r) => r !== s && !(s.sportId && r.sportId === s.sportId)));
  const toggle = (s: SportRow) => {
    const row = sports.find((r) => (s.sportId && r.sportId === s.sportId) || r.name === s.name);
    if (row) remove(row); else add(s);
  };
  const addCustom = () => {
    const name = custom.trim().replace(/\s+/g, " ");
    if (!name) return;
    const match = all.find((s) => s.name.toLowerCase() === name.toLowerCase());
    add(match ? { sportId: match.id, name: match.name } : { name });
    setCustom("");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-4">
        <Heading title="Во что играешь?" hint="Выбери виды спорта, а справа укажи уровень в каждом. Уровень можно не указывать." />
        <label className="flex h-14 items-center gap-3 rounded-[16px] border-2 border-primary bg-card px-4 focus-within:ring-[3px] focus-within:ring-ring/40">
          <Search className="size-5 text-muted-foreground" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Найти вид спорта"
            className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:font-medium" />
        </label>
        {found.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">Нашлось:</span>
            {found.map((s) => (
              <button key={s.id} type="button" onClick={() => { add({ sportId: s.id, name: s.name }); setText(""); }}
                className="inline-flex items-center gap-1 rounded-pill border-2 border-ink bg-card px-3 py-1 text-sm font-bold hover:bg-muted">
                <Plus className="size-3.5" />{s.name}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((s) => {
            const on = has({ sportId: s.id, name: s.name });
            return (
              <button key={s.id} type="button" aria-pressed={on} onClick={() => toggle({ sportId: s.id, name: s.name })}
                className={cn(
                  "relative flex h-[110px] flex-col justify-between overflow-hidden rounded-[18px] border-2 border-ink p-3 text-left transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  on ? "bg-primary text-white shadow-hard-sm" : "bg-card text-foreground",
                )}>
                <img src={s.imageUrl} alt="" className="size-10 rounded-lg object-cover" />
                <span className="font-display text-base font-bold">{s.name}</span>
                <span className={cn("absolute top-3 right-3 flex size-6 items-center justify-center rounded-full border-2",
                  on ? "border-ink bg-secondary" : "border-track")}>
                  {on && <Check className="size-3.5 text-ink" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-3">
          <label className="flex h-12 flex-1 items-center gap-2 rounded-[14px] border-2 border-dashed border-ink bg-card px-4">
            <Plus className="size-4 text-muted-foreground" />
            <input value={custom} maxLength={100} onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
              placeholder="Своего нет? Например, скейт или парусный спорт"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
          </label>
          <Button type="button" variant="ink" className="h-12" onClick={addCustom}>Добавить</Button>
        </div>
      </div>
      <aside className={cn(card, "flex h-fit flex-col gap-3 p-4")}>
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-bold">Твои виды</p>
          <span className="rounded-pill border-[1.5px] border-ink bg-secondary px-3 py-0.5 text-xs font-extrabold">{sports.length} из {SPORTS_MAX}</span>
        </div>
        {sports.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Выбери хотя бы один вид слева</p>}
        <div className="-mr-2 flex max-h-[min(420px,50dvh)] flex-col gap-3 overflow-y-auto pr-2">
        {sports.map((s) => (
          <div key={s.sportId ?? s.name} className="flex flex-col gap-2 rounded-[16px] bg-muted p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{s.name}{!s.sportId && <span className="ml-2 rounded-pill border border-ink px-2 text-[10px]">свой</span>}</span>
              <button type="button" aria-label={`Убрать: ${s.name}`} onClick={() => remove(s)}><X className="size-4" /></button>
            </div>
            <div className="grid grid-cols-4 gap-1 rounded-pill border-2 border-ink bg-card p-1" role="radiogroup" aria-label={`Уровень: ${s.name}`}>
              {LEVEL_OPTIONS.map((l) => (
                <button key={l ?? "any"} type="button" role="radio" aria-checked={s.level === l}
                  onClick={() => setSports(sports.map((r) => (r === s ? { ...r, level: l } : r)))}
                  className={cn("h-8 rounded-pill text-xs font-bold", s.level === l && (l ? "bg-primary text-white" : "bg-lavender-soft"))}>
                  {l ? SPORT_LEVEL_LABEL[l] : "—"}
                </button>
              ))}
            </div>
          </div>
        ))}
        </div>
        <p className="text-xs text-muted-foreground">«—» — уровень не указан: подойдут события любого уровня.</p>
      </aside>
    </div>
  );
}

/* ---------- 3. Когда и где ---------- */

const LEVELS = [
  { id: "BEGINNER", name: "Новичок", hint: "только начинаю" },
  { id: "AMATEUR", name: "Любитель", hint: "для души" },
  { id: "PRO", name: "Про", hint: "по плану" },
] as const;
const DAYS = [
  ["MONDAY", "Пн"], ["TUESDAY", "Вт"], ["WEDNESDAY", "Ср"], ["THURSDAY", "Чт"],
  ["FRIDAY", "Пт"], ["SATURDAY", "Сб"], ["SUNDAY", "Вс"],
] as const;
const DAYTIMES = [
  { id: "MORNING", label: "Утро", hint: "до 12" },
  { id: "DAY", label: "День", hint: "12–18" },
  { id: "EVENING", label: "Вечер", hint: "после 18" },
] as const;

export function StepSchedule({ prefs, setPrefs }: { prefs: Prefs; setPrefs(p: Prefs): void }) {
  const [locating, setLocating] = useState(false);
  const home: [number, number] | null = prefs.home ? [prefs.home.lon, prefs.home.lat] : null;
  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setPrefs({ ...prefs, home: { lat: p.coords.latitude, lon: p.coords.longitude } }); setLocating(false); },
      () => setLocating(false),
    );
  };
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col gap-4">
        <Heading title="Когда и где удобно?" hint="Чтобы не звать тебя на утренний марафон через весь город." />
        <section className={cn(card, "flex flex-col gap-3 p-4")}>
          <div className="flex items-center justify-between">
            <p className="font-display text-base font-bold">Общий уровень</p>
            <span className="text-xs text-muted-foreground">не меняет уровни по видам</span>
          </div>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Общий уровень">
            {LEVELS.map((l) => (
              <button key={l.id} type="button" role="radio" aria-checked={prefs.level === l.id}
                onClick={() => setPrefs({ ...prefs, level: l.id })}
                className={cn("flex flex-col items-start rounded-[14px] border-2 border-ink px-3 py-2 text-left",
                  prefs.level === l.id ? "bg-secondary shadow-hard-sm" : "bg-card")}>
                <span className="text-sm font-extrabold">{l.name}</span>
                <span className="text-xs text-muted-foreground">{l.hint}</span>
              </button>
            ))}
          </div>
        </section>
        <section className={cn(card, "flex flex-col gap-3 p-4")}>
          <div className="flex items-center justify-between">
            <p className="font-display text-base font-bold">Удобные дни</p>
            <span className="text-xs text-muted-foreground">хотя бы один</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map(([id, short]) => {
              const on = prefs.days.includes(id);
              return (
                <button key={id} type="button" aria-pressed={on}
                  onClick={() => setPrefs({ ...prefs, days: on ? prefs.days.filter((d) => d !== id) : [...prefs.days, id] })}
                  className={cn("h-11 rounded-xl border-2 border-ink text-sm font-extrabold", on ? "bg-primary text-white shadow-hard-sm" : "bg-card")}>
                  {short}
                </button>
              );
            })}
          </div>
        </section>
        <section className={cn(card, "flex flex-col gap-3 p-4")}>
          <p className="font-display text-base font-bold">Время дня</p>
          <div className="grid grid-cols-3 gap-1 rounded-pill border-2 border-ink bg-card p-1" role="radiogroup" aria-label="Время дня">
            {DAYTIMES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={prefs.daytime === t.id}
                onClick={() => setPrefs({ ...prefs, daytime: t.id })}
                className={cn("h-10 rounded-pill text-sm font-extrabold", prefs.daytime === t.id && "border-2 border-ink bg-secondary")}>
                {t.label} <span className="text-xs font-semibold text-muted-foreground">{t.hint}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <LocationPicker value={home} onChange={([lon, lat]) => setPrefs({ ...prefs, home: { lat, lon } })} className="h-[300px] lg:h-[400px]" />
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={locate} disabled={locating}>
              <LocateFixed className="size-4" />{locating ? "Ищем…" : "Моё местоположение"}
            </Button>
            {prefs.home && (
              <Button type="button" variant="outline" size="sm" onClick={() => setPrefs({ ...prefs, home: undefined })}>
                Не указывать дом
              </Button>
            )}
          </div>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Home className="size-4 shrink-0" />
          {prefs.home ? "Дом отмечен — нажми на карту, чтобы передвинуть." : "Нажми на карту, чтобы отметить дом."} Его видишь только ты.
        </p>
      </div>
    </div>
  );
}

/* ---------- 4. Чем помочь ---------- */

const HELPERS = [
  { key: "reminders", label: "Напоминать о тренировках", hint: "За пару часов до занятия, на которое записан", icon: Bell, tone: "bg-secondary" },
  { key: "nearby", label: "Подсказывать события рядом", hint: "Новые встречи по твоим видам", icon: MapIcon, tone: "bg-sky" },
  { key: "cheer", label: "Радоваться достижениям", hint: "Поздравит с серией и новыми штампами в паспорте", icon: PartyPopper, tone: "bg-peach" },
] as const;

export function StepHelpers({ prefs, setPrefs, pet }: { prefs: Prefs; setPrefs(p: Prefs): void; pet: Pet }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
      <div className="flex flex-col gap-4">
        <Heading title="Чем помочь?" hint={`${pet.name} может напоминать, подсказывать и радоваться вместе с тобой. Включи то, что нравится.`} />
        {HELPERS.map((h) => {
          const on = prefs.helpers[h.key];
          return (
            <label key={h.key} className={cn(card, "flex cursor-pointer items-center gap-4 p-4", on && "shadow-[5px_5px_0_var(--primary)]")}>
              <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-[14px] border-2 border-ink", h.tone)}>
                <h.icon className="size-5" />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-base font-extrabold">{h.label}</span>
                <span className="text-sm text-muted-foreground">{h.hint}</span>
              </span>
              <Switch checked={on} aria-label={h.label}
                onCheckedChange={(checked) => setPrefs({ ...prefs, helpers: { ...prefs.helpers, [h.key]: checked } })} />
            </label>
          );
        })}
      </div>
      <TalkingBeaver outfit={pet.outfit} activity={pet.activity} say="Я не болтун: пишу только по делу." />
    </div>
  );
}

/* ---------- 5. Бобр ---------- */

const RANDOM_NAMES = ["Бублик", "Тоша", "Пломбир", "Шустрик", "Кекс", "Борис", "Зефир", "Пончик"];

export function StepPet({
  pet, setPet, items, catalog,
}: {
  pet: Pet;
  setPet(p: Pet): void;
  items: ShopItemResponse[];
  catalog: PetCatalogResponse;
}) {
  const nameId = useId();
  const owned = items.filter((i) => i.owned && !(i.slot === ACTIVITY && i.code === NONE));
  const slots = catalog.slots.filter((s) => owned.some((i) => i.slot === s.id));
  const [slot, setSlot] = useState(slots.find((s) => s.id === "hat")?.id ?? slots[0]?.id);
  const worn = (i: ShopItemResponse) => (i.slot === ACTIVITY ? pet.activity === i.code : pet.outfit[i.slot] === i.code);
  const wear = (code: string | null) => {
    if (slot === ACTIVITY) return setPet({ ...pet, activity: code ?? NONE });
    const outfit = { ...pet.outfit };
    if (code) outfit[slot!] = code; else delete outfit[slot!];
    setPet({ ...pet, outfit });
  };
  const nothing = slot === ACTIVITY ? pet.activity === NONE : !pet.outfit[slot!];
  const tile = "relative flex h-[120px] flex-col items-center justify-center gap-1 rounded-[16px] border-2 text-sm font-bold";

  return (
    <div className="grid gap-8 lg:grid-cols-[440px_1fr]">
      <div className="flex flex-col gap-4">
        <Heading title="Знакомься, это твой бобр" hint="Дай ему имя и одень. Он будет радоваться твоим тренировкам." />
        <div className="relative h-[300px] overflow-hidden rounded-[24px] border-2 border-ink bg-sky">
          <div className="absolute inset-x-0 bottom-0 h-[90px] rounded-t-[50%] border-t-2 border-ink bg-secondary" />
          <TalkingBeaver outfit={pet.outfit} activity={pet.activity} className="absolute inset-0 justify-center"
            beaverClassName="h-[280px] w-[250px] [&_svg]:h-full" />
          <span className="absolute bottom-3 left-3 rounded-pill border-[1.5px] border-ink bg-card px-3 py-1 text-xs font-bold">настроение: радуется</span>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className={label}>КАК ЗОВУТ БОБРА?</label>
          <div className="flex gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-[14px] border-2 border-primary bg-card px-4 focus-within:ring-[3px] focus-within:ring-ring/40">
              <input id={nameId} value={pet.name} maxLength={PET_NAME_MAX} onChange={(e) => setPet({ ...pet, name: e.target.value })}
                className="h-12 min-w-0 flex-1 bg-transparent text-base font-bold outline-none" />
              <span className="text-xs text-muted-foreground">{pet.name.length} / {PET_NAME_MAX}</span>
            </div>
            <Button type="button" variant="outline" className="h-12"
              onClick={() => setPet({ ...pet, name: RANDOM_NAMES.filter((n) => n !== pet.name)[Math.floor(Math.random() * (RANDOM_NAMES.length - 1))] })}>
              <Shuffle className="size-4" />Случайное
            </Button>
          </div>
        </div>
      </div>
      <section className={cn(card, "flex h-fit flex-col gap-4 p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-lg font-bold">Гардероб</p>
          <span className="rounded-pill border-[1.5px] border-ink bg-secondary px-3 py-0.5 text-xs font-bold">твои вещи — бесплатно</span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Слоты">
          {slots.map((s) => (
            <button key={s.id} type="button" aria-pressed={slot === s.id} onClick={() => setSlot(s.id)}
              className={cn("rounded-pill border-2 border-ink px-3 py-1.5 text-sm font-bold", slot === s.id ? "bg-ink text-white" : "bg-card")}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button type="button" aria-pressed={nothing} onClick={() => wear(null)}
            className={cn(tile, "border-dashed", nothing ? "border-primary bg-lime-soft" : "border-ink bg-card")}>
            <X className="size-6 text-muted-foreground" />Без вещи
          </button>
          {owned.filter((i) => i.slot === slot).map((i) => {
            const on = worn(i);
            return (
              <button key={i.id} type="button" aria-pressed={on} onClick={() => wear(i.code)}
                className={cn(tile, on ? "border-[3px] border-primary bg-lime-soft" : "border-ink bg-card")}>
                <BeaverItemPreview slot={i.slot} code={i.code} className="size-16" />
                <span className="line-clamp-1 px-2">{i.label}</span>
                {on && <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border-2 border-ink bg-secondary"><Check className="size-3.5" /></span>}
              </button>
            );
          })}
        </div>
        <p className="rounded-[14px] border-2 border-ink bg-peach p-3 text-sm font-semibold">
          Новые вещи появляются в магазине — их покупают за монеты, которые дают за встречи.
        </p>
      </section>
    </div>
  );
}

/* ---------- 6. Готово ---------- */

export function StepDone({ name, children }: { name?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      <span className="flex size-28 items-center justify-center rounded-full border-2 border-ink bg-secondary shadow-hard">
        <Check className="size-14 text-ink" strokeWidth={3} />
      </span>
      <h1 className="font-display text-[36px] leading-tight font-extrabold tracking-[-0.5px] lg:text-[52px]">
        Готово{name ? `, ${name}` : ""}!
      </h1>
      <p className="max-w-[460px] text-lg font-medium text-muted-foreground">
        Профиль настроен. Подборка встреч под тебя ждёт в ленте.
      </p>
      {children}
    </div>
  );
}
