import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPetsGetMineQueryKey, usePetsCatalog, usePetsGetMine, usePetsSaveMine } from "@/shared/api/generated/core/pets/pets";
import { BeaverPet, type BeaverMood, type BeaverPetHandle } from "@/widgets/beaver-pet/ui/beaver-pet";
import { useCheerPet } from "@/widgets/beaver-pet/model/use-cheer-pet";
import { CLUBS, type ClubId } from "@/widgets/beaver-pet/ui/beaver-clubs";
import { HOCKEY_CLUBS, type HockeyClubId } from "@/widgets/beaver-pet/ui/beaver-hockey-clubs";
import type { BeaverActivity, BeaverArts, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";
import { useUser } from "@/entity/user/model/use-user";
import { PetItemsAdmin, type PetItemPreview } from "@/features/pet-items-admin/ui/pet-items-admin";

const MOODS: { value: BeaverMood; label: string }[] = [
  { value: "idle", label: "Улыбается" },
  { value: "happy", label: "Смеётся" },
  { value: "surprised", label: "Удивлён" },
  { value: "thinking", label: "Думает" },
  { value: "sad", label: "Переживает" },
  { value: "wink", label: "Подмигивает" },
  { value: "offended", label: "Обиделся" },
  { value: "sleep", label: "Спит" },
];

type Look = { label: string; outfit: BeaverOutfit; activity: BeaverActivity };
const LOOKS: Look[] = [
  { label: "Без всего", outfit: {}, activity: "none" },
  { label: "Футбол", outfit: { shirt: "football", hat: "cap" }, activity: "juggle" },
  { label: "Баскетбол", outfit: { shirt: "training", hat: "headband" }, activity: "dribble" },
  { label: "Бег", outfit: { shirt: "running", hat: "headband", eyewear: "sunglasses", neck: "medal" }, activity: "none" },
  { label: "Фитнес", outfit: { shirt: "training", neck: "whistle" }, activity: "lift" },
  { label: "Шахматы", outfit: {}, activity: "chess" },
  { label: "Плавание", outfit: { hat: "swimcap", eyewear: "goggles", bottom: "swimshorts" }, activity: "none" },
  { label: "Дзюдо", outfit: { shirt: "judo" }, activity: "none" },
  { label: "Лыжи", outfit: { hat: "beanie", eyewear: "sunglasses", shirt: "training" }, activity: "ski" },
  { label: "Хоккей", outfit: { shirt: "hockey", hat: "helmet", bottom: "hockeypants" }, activity: "hockey" },
  { label: "Киберспорт", outfit: { shirt: "training", hat: "headphones" }, activity: "esports" },
  { label: "Спортивное программирование", outfit: { shirt: "programming" }, activity: "programming" },
  { label: "Фиджитал", outfit: { shirt: "running", hat: "headphones", neck: "medal" }, activity: "esports" },
  ...Object.entries(HOCKEY_CLUBS).map(([id, club]): Look => ({ label: `ХК ${club.label}`, outfit: { shirt: id as HockeyClubId, hat: "helmet", bottom: "hockeypants" }, activity: "hockey" })),
  ...Object.entries(CLUBS).map(([id, club]): Look => ({ label: club.label, outfit: { shirt: id as ClubId }, activity: "juggle" })),
];

type Option = { value: string; label: string };
// Независимые категории гардероба.
const WARDROBE = {
  background: { label: "Фон", options: [] },
  prop: { label: "Предмет", options: [] },
  paws: { label: "На лапах", options: [] },
  feet: { label: "Обувь", options: [] },
  shirt: { label: "Одежда", options: [
    { value: "football", label: "Футбольная форма" }, { value: "running", label: "Беговая майка" },
    { value: "training", label: "Тренировочная футболка" }, { value: "judo", label: "Кимоно" },
    { value: "hockey", label: "Хоккейный свитер и краги" },
    { value: "programming", label: "Футболка ФСП России" },
    ...Object.entries(HOCKEY_CLUBS).map(([id, club]) => ({ value: id as HockeyClubId, label: `Хоккейная форма — ${club.label}` })),
    ...Object.entries(CLUBS).map(([id, club]) => ({ value: id as ClubId, label: `Футболка «${club.label}»` })),
  ] },
  hat: { label: "Головной убор", options: [
    { value: "cap", label: "Кепка" }, { value: "headband", label: "Повязка" },
    { value: "beanie", label: "Вязаная шапка" }, { value: "swimcap", label: "Шапочка для плавания" },
    { value: "helmet", label: "Хоккейный шлем" }, { value: "headphones", label: "Игровые наушники с микрофоном" },
  ] },
  eyewear: { label: "Очки", options: [
    { value: "sunglasses", label: "Солнцезащитные" }, { value: "goggles", label: "Для плавания" },
  ] },
  neck: { label: "На шее", options: [
    { value: "medal", label: "Медаль" }, { value: "whistle", label: "Свисток" },
  ] },
  bottom: { label: "Низ и экипировка", options: [
    { value: "swimshorts", label: "Плавки с жёлтой отделкой" }, { value: "hockeypants", label: "Хоккейные шорты и коньки" },
  ] },
} satisfies { [K in keyof BeaverOutfit]-?: { label: string; options: { value: NonNullable<BeaverOutfit[K]>; label: string }[] } };
const FIELDS = Object.keys(WARDROBE) as (keyof BeaverOutfit)[];
const ACTIVITIES: { value: BeaverActivity; label: string }[] = [
  { value: "none", label: "Без инвентаря" }, { value: "juggle", label: "Футбольный мяч" },
  { value: "dribble", label: "Баскетбольный мяч" }, { value: "lift", label: "Гантели" },
  { value: "chess", label: "Шахматная доска и фигуры" }, { value: "ski", label: "Лыжи и палки" },
  { value: "programming", label: "Ноутбук с кодом" },
  { value: "hockey", label: "Скользящая шайба" }, { value: "esports", label: "Игровой ноутбук" },
];
const button = (active: boolean) =>
  `rounded-xl border px-4 py-2 text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`;

function Choice({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange(value: string): void }) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full min-w-0 rounded-xl border bg-background px-3 py-3 text-base focus-visible:outline-2 focus-visible:outline-primary">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export default function PetPage() {
  const pet = useRef<BeaverPetHandle>(null);
  const query = usePetsGetMine();
  const catalog = usePetsCatalog({ query: { staleTime: 5 * 60_000 } });
  // Встроенные и добавленные вещи берём из единого каталога, включая новые слоты.
  const optionsFor = (slot: keyof BeaverOutfit): Option[] => catalog.data?.data.slots.find((s) => s.id === slot)?.items
    .map((item) => ({ value: item.id, label: item.label })) ?? WARDROBE[slot].options;
  const custom = (slot: string): Option[] => catalog.data?.data.slots.find((s) => s.id === slot)?.items
    .filter((item) => item.art).map((item) => ({ value: item.id, label: item.label })) ?? [];
  const queryClient = useQueryClient();
  const current = query.data?.data;
  const cheer = useCheerPet(current?.mood);
  const [draft, setDraft] = useState<Pick<Look, "outfit" | "activity"> | null>(null);
  const save = usePetsSaveMine({ mutation: {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getPetsGetMineQueryKey() }),
  } });
  const outfit = draft?.outfit ?? (current?.outfit as BeaverOutfit | undefined) ?? {};
  const activity = draft?.activity ?? (current?.activity as BeaverActivity | undefined) ?? "none";
  const mood = current?.mood ?? "idle";
  const persist = (next: Pick<Look, "outfit" | "activity">) => {
    setDraft(next);
    save.mutate({ data: { activity: next.activity, outfit: { ...next.outfit } } });
  };
  const update = (key: keyof BeaverOutfit | "activity", value: string) => {
    if (key === "activity") {
      persist({ outfit, activity: value as BeaverActivity });
      return;
    }
    const next = { ...outfit };
    if (value === "none") delete next[key];
    else Object.assign(next, { [key]: value });
    persist({ outfit: next, activity });
  };
  const setLook = (label: string) => {
    const look = LOOKS.find((item) => item.label === label);
    if (look) persist({ outfit: look.outfit, activity: look.activity });
  };
  const matchesLook = (look: Look) => activity === look.activity && FIELDS.every((key) => outfit[key] === look.outfit[key]);
  const disabled = query.isPending || query.isError || save.isPending;
  const { user } = useUser();
  // Примерка админа: вещь под кодом "preview" временно занимает свой слот, образ не сохраняется.
  const [adminPreview, setAdminPreview] = useState<PetItemPreview>(null);
  const previewArts = useMemo<BeaverArts | undefined>(
    () => adminPreview ? { [`${adminPreview.slot}:preview`]: adminPreview.art } : undefined, [adminPreview]);
  const shownOutfit = adminPreview && adminPreview.slot !== "activity" ? { ...outfit, [adminPreview.slot]: "preview" } as BeaverOutfit : outfit;
  const shownActivity = adminPreview?.slot === "activity" ? "preview" as BeaverActivity : activity;

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-8 sm:px-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">{current?.name ?? "Питомец"}: гардероб</h1>
        <p className="mt-2 text-muted-foreground">Выбери готовый образ или собери свой из отдельных вещей.</p>
      </div>
      <div className="grid items-start gap-8 md:grid-cols-2">
        <div className="md:sticky md:top-6">
          <div className="rounded-[3rem] bg-[#F6EEE4] px-2 pb-5 pt-8 sm:px-4">
            {query.isPending ? <div className="aspect-square animate-pulse rounded-3xl bg-white/40" role="status" aria-label="Загружаем питомца" /> :
              <BeaverPet ref={pet} onCheer={cheer} mood={query.isError ? "idle" : mood} outfit={shownOutfit} activity={shownActivity} extraArts={previewArts}
                say={query.isError ? undefined : current?.status?.message}
                sayHref={current?.status?.eventId ? `/events/${current.status.eventId}` : undefined} /> }
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Ткни в нос, голову, живот, хвост или лапу — каждый раз своя реакция. Поводи мышкой туда-сюда по голове — бобр зажмурится от удовольствия. Только не затыкай его.
          </p>
          <fieldset className="mt-5">
            <legend className="mb-3 text-sm font-medium">Эмоции: проиграть и вернуться</legend>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => <button key={m.value} type="button" onClick={() => pet.current?.react(m.value)} className={button(false)}>{m.label}</button>)}
            </div>
          </fieldset>
        </div>
        <div className="space-y-7">
          {user?.systemRole === "ADMIN" && <PetItemsAdmin onPreview={setAdminPreview} />}
          <div role="status" aria-live="polite" className="min-h-7 text-base font-medium">
            {query.isPending ? "Загружаем образ…" : query.isError ? "Не удалось загрузить питомца." : save.isPending ? "Сохраняем…" : save.isError ? "Не удалось сохранить образ." : "Сохранено"}
            {query.isError && <button type="button" onClick={() => void query.refetch()} className="ml-3 underline">Повторить загрузку</button>}
            {save.isError && <button type="button" onClick={() => persist({ outfit, activity })} className="ml-3 underline">Повторить сохранение</button>}
          </div>
          <fieldset disabled={disabled} className="disabled:opacity-60">
            <legend className="mb-3 text-lg font-semibold">Готовые образы</legend>
            <div className="flex flex-wrap gap-2">
              {LOOKS.map((l) => <button key={l.label} type="button" aria-pressed={matchesLook(l)} onClick={() => setLook(l.label)} className={button(matchesLook(l))}>{l.label}</button>)}
            </div>
          </fieldset>
          <fieldset disabled={disabled} className="disabled:opacity-60">
            <legend className="mb-3 text-lg font-semibold">Отдельные элементы</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              {FIELDS.map((field) => <Choice key={field} label={WARDROBE[field].label} value={outfit[field] ?? "none"} options={[{ value: "none", label: "Без элемента" }, ...optionsFor(field)]} onChange={(value) => update(field, value)} />)}
              <Choice label="Инвентарь" value={activity} options={[...ACTIVITIES, ...custom("activity")]} onChange={(value) => update("activity", value)} />
            </div>
          </fieldset>
          <button type="button" disabled={disabled} onClick={() => setLook("Без всего")} className="text-sm underline underline-offset-4">Снять все вещи и убрать инвентарь</button>
          <p className="text-sm text-muted-foreground">Одежда и инвентарь сохраняются в профиле. Эмоции проигрываются один раз.</p>
        </div>
      </div>
    </main>
  );
}
