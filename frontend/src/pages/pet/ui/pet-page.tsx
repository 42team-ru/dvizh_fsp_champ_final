import { useSearchParams } from "react-router";
import { BeaverPet, type BeaverMood } from "@/widgets/beaver-pet/ui/beaver-pet";
import { CLUBS, type ClubId } from "@/widgets/beaver-pet/ui/beaver-clubs";
import { HOCKEY_CLUBS, type HockeyClubId } from "@/widgets/beaver-pet/ui/beaver-hockey-clubs";
import type { BeaverActivity, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";

const MOODS: { value: BeaverMood; label: string }[] = [
  { value: "idle", label: "Спокойный" },
  { value: "happy", label: "Радость" },
  { value: "sad", label: "Грусть" },
  { value: "thinking", label: "Думает" },
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
  { label: "Фиджитал", outfit: { shirt: "running", hat: "headphones", neck: "medal" }, activity: "esports" },
  ...Object.entries(HOCKEY_CLUBS).map(([id, club]): Look => ({ label: `ХК ${club.label}`, outfit: { shirt: id as HockeyClubId, hat: "helmet", bottom: "hockeypants" }, activity: "hockey" })),
  ...Object.entries(CLUBS).map(([id, club]): Look => ({ label: club.label, outfit: { shirt: id as ClubId }, activity: "juggle" })),
];

type Option = { value: string; label: string };
// Ключи одновременно задают категории гардероба и параметры ссылки на образ.
const WARDROBE = {
  shirt: { label: "Одежда", options: [
    { value: "football", label: "Футбольная форма" }, { value: "running", label: "Беговая майка" },
    { value: "training", label: "Тренировочная футболка" }, { value: "judo", label: "Кимоно" },
    { value: "hockey", label: "Хоккейный свитер и краги" },
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
  { value: "hockey", label: "Клюшка и шайба" }, { value: "esports", label: "Игровой ноутбук" },
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
  const [params, setParams] = useSearchParams();
  const mood = MOODS.find((m) => m.value === params.get("mood"))?.value ?? "idle";
  const look = LOOKS.find((l) => l.label === (params.get("look") ?? "Футбол")) ?? LOOKS[0];
  const outfit = { ...look.outfit };
  for (const field of FIELDS) {
    const value = params.get(field);
    if (value === "none") delete outfit[field];
    else if (WARDROBE[field].options.some((option) => option.value === value)) {
      // Значение проверено по опциям именно этой категории.
      Object.assign(outfit, { [field]: value });
    }
  }
  const activity = ACTIVITIES.find((a) => a.value === params.get("activity"))?.value ?? look.activity;
  const customized = FIELDS.some((field) => params.has(field)) || params.has("activity");
  const update = (key: string, value: string) => setParams((previous) => {
    const next = new URLSearchParams(previous);
    next.set(key, value);
    return next;
  }, { replace: true, preventScrollReset: true });
  const setLook = (label: string) => setParams((previous) => {
    const next = new URLSearchParams(previous);
    for (const field of [...FIELDS, "activity"]) next.delete(field);
    next.set("look", label);
    return next;
  }, { replace: true, preventScrollReset: true });

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-8 sm:px-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Одень бобра</h1>
        <p className="mt-2 text-muted-foreground">Выбери готовый образ или собери свой из отдельных вещей.</p>
      </div>
      <div className="grid items-start gap-8 md:grid-cols-2">
        <div className="md:sticky md:top-6">
          <div className="rounded-[3rem] bg-[#F6EEE4] px-2 pb-5 pt-8 sm:px-4">
            <BeaverPet mood={mood} outfit={outfit} activity={activity} className="cursor-pointer" />
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">Наведи мышку — он смотрит. Нажми на бобра — подпрыгнет и помашет.</p>
          <fieldset className="mt-5">
            <legend className="mb-3 text-sm font-medium">Настроение</legend>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => <button key={m.value} type="button" aria-pressed={mood === m.value} onClick={() => update("mood", m.value)} className={button(mood === m.value)}>{m.label}</button>)}
            </div>
          </fieldset>
        </div>
        <div className="space-y-7">
          <fieldset>
            <legend className="mb-3 text-lg font-semibold">Готовые образы</legend>
            <div className="flex flex-wrap gap-2">
              {LOOKS.map((l) => <button key={l.label} type="button" aria-pressed={!customized && look.label === l.label} onClick={() => setLook(l.label)} className={button(!customized && look.label === l.label)}>{l.label}</button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-3 text-lg font-semibold">Отдельные элементы</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              {FIELDS.map((field) => <Choice key={field} label={WARDROBE[field].label} value={outfit[field] ?? "none"} options={[{ value: "none", label: "Без элемента" }, ...WARDROBE[field].options]} onChange={(value) => update(field, value)} />)}
              <Choice label="Инвентарь" value={activity} options={ACTIVITIES} onChange={(value) => update("activity", value)} />
            </div>
          </fieldset>
          <button type="button" onClick={() => setLook("Без всего")} className="text-sm underline underline-offset-4">Снять все вещи и убрать инвентарь</button>
          <p className="text-sm text-muted-foreground">Образ сохраняется в ссылке — её можно скопировать и открыть снова.</p>
        </div>
      </div>
    </main>
  );
}
