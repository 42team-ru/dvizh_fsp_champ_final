import { useEffect, useId, useRef, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { Bell, Check, LocateFixed, Map as MapIcon, MapPin, Plus, PartyPopper, Search, Shuffle, Upload, X } from "lucide-react";
import { motion } from "motion/react";
import { Slider } from "@/shared/components/ui/slider";
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
export type Prefs = SaveUserPreferencesRequest;
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

/** Крупный заголовок шага и подсказка под ним, как в макете. */
export function StepTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-[34px] leading-[1.05] font-extrabold tracking-[-1px] text-foreground lg:text-[48px]">
        {title}
      </h1>
      <p className="text-[15px] font-medium text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Карточки шага появляются друг за другом. */
const rise = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.05 * i, type: "spring" as const, stiffness: 280, damping: 26 },
});

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
    <div className="flex flex-col gap-4">
      <StepTitle title="Расскажи о себе" hint="Имя и город видят все. По городу подберём встречи, даже без геолокации." />
      <motion.section {...rise(1)} className={cn(card, "flex items-center gap-5 p-4")}>
        <div className="relative shrink-0">
          <UserAvatar user={preview} className="size-[88px] rounded-full border-2 border-ink bg-sky object-cover" />
          <span className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border-2 border-ink bg-secondary">
            <Upload className="size-4" />
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-base font-extrabold">Фото профиля</p>
          <p className="text-xs font-medium text-muted-foreground">JPG, PNG или WebP до 5 МБ. Без фото — инициалы.</p>
          <label className="inline-flex h-11 w-fit cursor-pointer items-center gap-2 rounded-pill border-2 border-ink bg-ink px-5 text-sm font-extrabold text-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
            <Upload className="size-4" />
            {uploading ? "Загружаем…" : user.avatarUrl ? "Заменить" : "Загрузить"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
          </label>
        </div>
      </motion.section>
      <motion.div {...rise(2)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.first} className={label}>ИМЯ *</label>
          <input id={ids.first} maxLength={100} value={profile.firstName} className={input}
            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.last} className={label}>ФАМИЛИЯ *</label>
          <input id={ids.last} maxLength={100} value={profile.lastName} className={input}
            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
        </div>
      </motion.div>
      <motion.div {...rise(3)} className="flex flex-col gap-2">
        <label htmlFor={ids.city} className={label}>ГОРОД</label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <input id={ids.city} maxLength={100} value={profile.city} placeholder="Красноярск" className={cn(input, "pl-11")}
            onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
        </div>
      </motion.div>
      <motion.div {...rise(4)} className="flex flex-col gap-2">
        <label htmlFor={ids.bio} className={label}>О СЕБЕ</label>
        <textarea id={ids.bio} maxLength={BIO_MAX} rows={3} value={profile.bio} className={cn(input, "resize-none")}
          placeholder="Чем занимаешься и что ищешь"
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
        <span className="text-xs text-muted-foreground">{profile.bio.length} / {BIO_MAX}</span>
      </motion.div>
    </div>
  );
}

/* ---------- 2. Виды спорта ---------- */

const TILE_LEVELS: { id: UserSportRequestLevel; short: string }[] = [
  { id: "BEGINNER", short: "Нов" }, { id: "AMATEUR", short: "Люб" }, { id: "PRO", short: "Про" },
];

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

  const find = (s: { sportId?: string; name: string }) =>
    sports.find((r) => (s.sportId && r.sportId === s.sportId) || r.name.toLowerCase() === s.name.toLowerCase());
  const add = (s: SportRow) => { if (!find(s) && sports.length < SPORTS_MAX) setSports([...sports, s]); };
  const remove = (s: SportRow) => setSports(sports.filter((r) => r !== s));
  const setLevel = (row: SportRow, level?: UserSportRequestLevel) =>
    setSports(sports.map((r) => (r === row ? { ...r, level } : r)));
  const addCustom = () => {
    const name = custom.trim().replace(/\s+/g, " ");
    if (!name) return;
    const match = all.find((s) => s.name.toLowerCase() === name.toLowerCase());
    add(match ? { sportId: match.id, name: match.name } : { name });
    setCustom("");
  };
  // свои и найденные поиском виды, которых нет среди плиток, — чипами под плитками
  const extra = sports.filter((r) => !tiles.some((t) => t.id === r.sportId));

  return (
    <div className="flex flex-col gap-4">
      <StepTitle title="Во что играешь?" hint="Выбери виды и уровень в каждом. Без уровня — подойдут встречи любого." />
      <label className="flex h-14 items-center gap-3 rounded-[16px] border-2 border-primary bg-card px-4 focus-within:ring-[3px] focus-within:ring-ring/40">
        <Search className="size-5 text-muted-foreground" />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Найти вид спорта"
          className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:font-medium" />
        <span className="rounded-pill border-[1.5px] border-track px-2 text-[11px] font-bold text-muted-foreground">ё = е</span>
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
        {tiles.map((s, i) => {
          const row = find({ sportId: s.id, name: s.name });
          const on = !!row;
          return (
            <motion.div key={s.id} {...rise(i)} whileHover={{ y: -3 }}
              className={cn(
                "relative flex h-[140px] flex-col rounded-[18px] border-2 border-ink p-3 text-left transition-colors",
                on ? "bg-primary text-white shadow-hard-sm" : "bg-card text-foreground",
              )}>
              <button type="button" aria-pressed={on} aria-label={s.name}
                onClick={() => (row ? remove(row) : add({ sportId: s.id, name: s.name }))}
                className="absolute inset-0 rounded-[16px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
              <img src={s.imageUrl} alt="" className="pointer-events-none size-9 rounded-lg border-[1.5px] border-ink object-cover" />
              <span className="pointer-events-none mt-2 truncate font-display text-base font-bold">{s.name}</span>
              <span className={cn("pointer-events-none absolute top-3 right-3 flex size-6 items-center justify-center rounded-full border-2",
                on ? "border-ink bg-secondary" : "border-track")}>
                {on && <Check className="size-3.5 text-ink" strokeWidth={3} />}
              </span>
              {row ? (
                <div className="relative mt-auto grid grid-cols-3 rounded-pill bg-white/15 p-0.5" role="radiogroup" aria-label={`Уровень: ${s.name}`}>
                  {TILE_LEVELS.map((l) => (
                    <button key={l.id} type="button" role="radio" aria-checked={row.level === l.id}
                      onClick={() => setLevel(row, row.level === l.id ? undefined : l.id)}
                      className={cn("h-7 rounded-pill text-[11px] font-bold", row.level === l.id ? "bg-secondary text-ink" : "text-white/80")}>
                      {l.short}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="pointer-events-none mt-auto text-[11px] font-semibold text-muted-foreground">нажми, чтобы выбрать</span>
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {extra.map((r) => (
          <span key={r.sportId ?? r.name} className="inline-flex items-center gap-1 rounded-pill border-2 border-ink bg-secondary py-1 pr-1 pl-3 text-sm font-bold">
            <Check className="size-3.5" strokeWidth={3} />
            {r.name}{!r.sportId && " · свой"}
            <select aria-label={`Уровень: ${r.name}`} value={r.level ?? ""}
              onChange={(e) => setLevel(r, (e.target.value || undefined) as UserSportRequestLevel | undefined)}
              className="ml-1 rounded-pill bg-card px-1 text-xs font-bold outline-none">
              <option value="">любой</option>
              {TILE_LEVELS.map((l) => <option key={l.id} value={l.id}>{SPORT_LEVEL_LABEL[l.id]}</option>)}
            </select>
            <button type="button" aria-label={`Убрать: ${r.name}`} onClick={() => remove(r)} className="rounded-full p-1 hover:bg-white/50">
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <label className="flex h-11 min-w-[240px] flex-1 items-center gap-2 rounded-pill border-2 border-dashed border-ink bg-card px-4">
          <Plus className="size-4 text-muted-foreground" />
          <input value={custom} maxLength={100} onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            placeholder="Добавить свой вид"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
          {custom.trim() && <button type="button" onClick={addCustom} className="text-sm font-extrabold text-primary">Добавить</button>}
        </label>
      </div>
    </div>
  );
}

/* ---------- 3. Когда и где ---------- */

const LEVELS = [
  { id: "BEGINNER", name: "Новичок", hint: "только начинаю", bars: 1 },
  { id: "AMATEUR", name: "Любитель", hint: "для души", bars: 2 },
  { id: "PRO", name: "Про", hint: "по плану", bars: 3 },
] as const;
const DAYS = [
  ["MONDAY", "Пн"], ["TUESDAY", "Вт"], ["WEDNESDAY", "Ср"], ["THURSDAY", "Чт"],
  ["FRIDAY", "Пт"], ["SATURDAY", "Сб"], ["SUNDAY", "Вс"],
] as const;
const DAYTIMES = [
  { id: "MORNING", label: "Утро" },
  { id: "DAY", label: "День" },
  { id: "EVENING", label: "Вечер" },
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
    <div className="flex flex-col gap-4">
      <StepTitle title="Когда и где удобно?" hint="Чтобы не звать тебя на утренний марафон через весь город." />
      <motion.section {...rise(1)} className={cn(card, "flex flex-col gap-3 p-4")}>
        <div className="flex items-center justify-between">
          <p className="text-base font-extrabold">Общий уровень</p>
          <span className="text-xs text-muted-foreground">не меняет уровни по видам</span>
        </div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Общий уровень">
          {LEVELS.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={prefs.level === l.id}
              onClick={() => setPrefs({ ...prefs, level: l.id })}
              className={cn("flex min-w-0 flex-col items-start gap-1 rounded-[14px] border-2 border-ink px-2.5 py-2 text-left transition-colors sm:flex-row sm:items-center sm:gap-3 sm:px-3",
                prefs.level === l.id ? "bg-secondary shadow-hard-sm" : "bg-card hover:bg-muted")}>
              <span className="flex items-end gap-[2px]" aria-hidden>
                {[8, 12, 16].map((h, i) => (
                  <span key={h} className={cn("w-1 rounded-[1px] border border-ink", i < l.bars ? "bg-primary" : "bg-card")} style={{ height: h }} />
                ))}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-extrabold">{l.name}</span>
                <span className="hidden text-xs text-muted-foreground sm:block">{l.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </motion.section>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <motion.section {...rise(2)} className={cn(card, "flex flex-col gap-3 p-4")}>
          <div className="flex items-center justify-between">
            <p className="text-base font-extrabold">Удобные дни</p>
            <span className="rounded-pill border-[1.5px] border-ink px-2 text-[11px] font-bold">хотя бы один</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map(([id, short]) => {
              const on = prefs.days.includes(id);
              return (
                <motion.button key={id} type="button" aria-pressed={on} whileTap={{ scale: 0.9 }}
                  onClick={() => setPrefs({ ...prefs, days: on ? prefs.days.filter((d) => d !== id) : [...prefs.days, id] })}
                  className={cn("h-10 rounded-[10px] border-2 border-ink text-xs font-extrabold", on ? "bg-primary text-white" : "bg-card")}>
                  {short}
                </motion.button>
              );
            })}
          </div>
        </motion.section>
        <motion.section {...rise(3)} className={cn(card, "flex flex-col gap-3 p-4")}>
          <p className="text-base font-extrabold">Время дня</p>
          <div className="grid grid-cols-3 gap-1 rounded-pill border-2 border-ink bg-card p-1" role="radiogroup" aria-label="Время дня">
            {DAYTIMES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={prefs.daytime === t.id}
                onClick={() => setPrefs({ ...prefs, daytime: t.id })}
                className={cn("h-9 rounded-pill text-sm font-extrabold", prefs.daytime === t.id && "border-2 border-ink bg-secondary")}>
                {t.label}
              </button>
            ))}
          </div>
        </motion.section>
      </div>
      <motion.section {...rise(4)} className={cn(card, "flex flex-col gap-4 p-4 sm:flex-row")}>
        <LocationPicker value={home} onChange={([lon, lat]) => setPrefs({ ...prefs, home: { lat, lon } })}
          className="h-[180px] w-full shrink-0 overflow-hidden rounded-[14px] border-2 border-ink sm:w-[240px]" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-base font-extrabold">Радиус от дома</p>
            <span className="rounded-pill border-[1.5px] border-ink bg-sky px-2 py-0.5 text-xs font-extrabold">{prefs.radiusKm} км</span>
          </div>
          <Slider min={1} max={20} step={1} value={[prefs.radiusKm]} onValueChange={([v]) => setPrefs({ ...prefs, radiusKm: v })} />
          <div className="flex justify-between text-xs text-muted-foreground"><span>1 км</span><span>20 км</span></div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={locate} disabled={locating}>
              <LocateFixed className="size-4" />{locating ? "Ищем…" : "Моё место"}
            </Button>
            {prefs.home && (
              <Button type="button" variant="outline" size="sm" onClick={() => setPrefs({ ...prefs, home: undefined })}>Без дома</Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {prefs.home ? "Дом отмечен — нажми на карту, чтобы передвинуть." : "Нажми на карту, чтобы отметить дом."} Его видишь только ты.
          </p>
        </div>
      </motion.section>
    </div>
  );
}

/* ---------- 4. Чем помочь ---------- */

const HELPERS = [
  { key: "reminders", label: "Напоминать о тренировках", hint: "Перед занятием, на которое записан", icon: Bell, tone: "bg-secondary" },
  { key: "nearby", label: "Подсказывать события рядом", hint: "Новые встречи в радиусе и по твоим видам", icon: MapIcon, tone: "bg-sky" },
  { key: "cheer", label: "Радоваться достижениям", hint: "Серии, штампы и уровни бобра", icon: PartyPopper, tone: "bg-peach" },
] as const;

export function StepHelpers({ prefs, setPrefs, pet }: { prefs: Prefs; setPrefs(p: Prefs): void; pet: Pet }) {
  return (
    <div className="flex flex-col gap-4">
      <StepTitle title="Чем помочь?" hint={`${pet.name} может напоминать, подсказывать и радоваться вместе с тобой. Включи то, что нравится.`} />
      {HELPERS.map((h, i) => {
        const on = prefs.helpers[h.key];
        return (
          <motion.label key={h.key} {...rise(i + 1)}
            className={cn(card, "flex cursor-pointer items-center gap-4 p-4 transition-shadow", on && "shadow-[5px_5px_0_var(--primary)]")}>
            <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-[14px] border-2 border-ink", h.tone)}>
              <h.icon className="size-5" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-base font-extrabold">{h.label}</span>
              <span className="text-sm text-muted-foreground">{h.hint}</span>
            </span>
            <Switch checked={on} aria-label={h.label}
              onCheckedChange={(checked) => setPrefs({ ...prefs, helpers: { ...prefs.helpers, [h.key]: checked } })} />
          </motion.label>
        );
      })}
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[440px_1fr]">
      <div className="flex flex-col gap-4">
        <StepTitle title="Знакомься, это твой бобр" hint="Дай ему имя и одень. Он будет радоваться твоим тренировкам." />
        <div className="relative h-[340px] overflow-hidden rounded-[24px] border-2 border-ink bg-sky-soft">
          <div className="absolute inset-x-0 bottom-0 h-[90px] rounded-t-[50%] border-t-2 border-ink bg-secondary" />
          <TalkingBeaver outfit={pet.outfit} activity={pet.activity} className="absolute inset-0 justify-center"
            beaverClassName="h-[280px] w-[250px] [&_svg]:h-full" />
          <span className="absolute bottom-3 left-3 rounded-pill border-[1.5px] border-ink bg-card px-3 py-1 text-xs font-bold">настроение: радуется</span>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className={label}>КАК ЗОВУТ БОБРА?</label>
          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] border-2 border-primary bg-card px-4 focus-within:ring-[3px] focus-within:ring-ring/40">
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
