import { useEffect, useRef } from "react";
import { usePetsGetMine } from "@/shared/api/generated/core/pets/pets";
import { BeaverPet, type BeaverMood, type BeaverPetHandle } from "./beaver-pet";
import type { ReactOptions } from "./beaver-rig";
import type { BeaverActivity, BeaverOutfit } from "./beaver-wardrobe";

/** Приветствия в случайном порядке: спокойный взмах лапой, иногда с искрами — без прыжков, чтобы не отвлекать от текста. */
const GREETINGS: { mood: BeaverMood; opts: ReactOptions }[] = [
  { mood: "happy", opts: { ms: 1400, wave: true } },
  { mood: "wink", opts: { ms: 1600, wave: true } }, // искры у головы
];

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/**
 * Живой бобр хозяина, который машет зрителю: наряд из гардероба, при открытии и потом раз в 12–20 секунд —
 * короткое приветствие (взмах, иногда с подмигиванием и искрами). Реплик нет; ткнуть можно, как в профиле.
 */
export function WavingBeaver({ className }: { className?: string }) {
  const query = usePetsGetMine();
  const pet = query.isError ? undefined : query.data?.data;
  const beaver = useRef<BeaverPetHandle>(null);

  useEffect(() => {
    let timer = 0;
    const greet = () => {
      const { mood, opts } = pick(GREETINGS);
      beaver.current?.react(mood, opts);
      timer = window.setTimeout(greet, 12_000 + Math.random() * 8_000);
    };
    timer = window.setTimeout(greet, 800);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <BeaverPet
      ref={beaver}
      className={`[&_.beaver-speech]:hidden ${className ?? ""}`}
      mood="happy"
      outfit={pet?.outfit as BeaverOutfit | undefined}
      activity={pet?.activity as BeaverActivity | undefined}
    />
  );
}
