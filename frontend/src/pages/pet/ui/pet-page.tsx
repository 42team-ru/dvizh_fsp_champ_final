import { useSearchParams } from "react-router";
import { BeaverPet, type BeaverMood } from "@/widgets/beaver-pet/ui/beaver-pet";
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
  { label: "Плавание", outfit: { hat: "swimcap", eyewear: "goggles" }, activity: "none" },
  { label: "Дзюдо", outfit: { shirt: "judo" }, activity: "none" },
  { label: "Лыжи", outfit: { hat: "beanie", eyewear: "sunglasses", shirt: "training" }, activity: "none" },
];

const button = (active: boolean) =>
  `rounded-lg border px-4 py-2 text-lg ${active ? "bg-primary text-primary-foreground" : ""}`;

// TODO: тестовая страница маскота, убрать или встроить в продукт
export default function PetPage() {
  // Состояние живёт в URL, чтобы любой образ можно было открыть ссылкой и снять скриншотом:
  // /pet?look=Футбол&mood=happy
  const [params, setParams] = useSearchParams();
  const mood = (params.get("mood") as BeaverMood | null) ?? "idle";
  const look = Math.max(0, LOOKS.findIndex((l) => l.label === (params.get("look") ?? "Футбол")));
  const update = (key: string, value: string) =>
    setParams((p) => { p.set(key, value); return p; }, { replace: true });
  const setMood = (m: BeaverMood) => update("mood", m);
  const setLook = (i: number) => update("look", LOOKS[i].label);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="w-full max-w-sm rounded-full bg-[#F6EEE4] p-6 pt-14">
        <BeaverPet mood={mood} outfit={LOOKS[look].outfit} activity={LOOKS[look].activity} className="cursor-pointer" />
      </div>
      <p className="text-muted-foreground">Наведи мышку — он смотрит. Кликни — подпрыгнет и помашет.</p>
      <div className="flex flex-wrap justify-center gap-2">
        {LOOKS.map((l, i) => (
          <button key={l.label} type="button" onClick={() => setLook(i)} className={button(look === i)}>
            {l.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {MOODS.map((m) => (
          <button key={m.value} type="button" onClick={() => setMood(m.value)} className={button(mood === m.value)}>
            {m.label}
          </button>
        ))}
      </div>
    </main>
  );
}
