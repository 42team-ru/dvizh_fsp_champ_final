import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { BeaverPet, type BeaverMood, type BeaverPetHandle } from "@/widgets/beaver-pet/ui/beaver-pet";
import type { ReactOptions } from "@/widgets/beaver-pet/ui/beaver-rig";
import type { BeaverActivity, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";

type Reaction = { mood: BeaverMood; opts?: ReactOptions };

/** Что Бублик делает время от времени на каждом слайде. */
const REACTIONS = {
  wave: [{ mood: "happy", opts: { ms: 1400, wave: true } }, { mood: "wink", opts: { ms: 1600, wave: true } }],
  think: [{ mood: "thinking", opts: { ms: 2600, wiggle: true } }, { mood: "surprised", opts: { ms: 1200 } }],
  cheer: [{ mood: "happy", opts: { ms: 1600, hop: true } }, { mood: "wink", opts: { ms: 1400 } }],
} satisfies Record<string, Reaction[]>;

/**
 * Живой Бублик лендинга: тот же анимированный бобр, что в профиле (дышит, моргает, следит за курсором,
 * отвечает на тычок), плюс своё действие раз в 6–10 секунд. Каталог вещей не грузим: гость не вошёл.
 */
export function LandingBeaver({
  mood = "happy",
  act = "wave",
  outfit,
  looks,
  activity,
  className,
}: {
  mood?: BeaverMood;
  act?: keyof typeof REACTIONS;
  outfit?: BeaverOutfit;
  /** Образы по кругу раз в 3 секунды — бобр переодевается (вместо `outfit`). */
  looks?: BeaverOutfit[];
  activity?: BeaverActivity;
  className?: string;
}) {
  const beaver = useRef<BeaverPetHandle>(null);
  const [look, setLook] = useState(0);

  useEffect(() => {
    if (!looks?.length) return;
    const timer = window.setInterval(() => {
      setLook((i) => (i + 1) % looks.length);
      beaver.current?.react("happy", { ms: 1000, hop: true });
    }, 3_000);
    return () => window.clearInterval(timer);
  }, [looks]);

  useEffect(() => {
    const list: Reaction[] = REACTIONS[act];
    let timer = 0;
    const play = () => {
      const { mood: m, opts } = list[Math.floor(Math.random() * list.length)];
      beaver.current?.react(m, opts);
      timer = window.setTimeout(play, 6_000 + Math.random() * 4_000);
    };
    timer = window.setTimeout(play, 900 + Math.random() * 1_200);
    return () => window.clearTimeout(timer);
  }, [act]);

  return (
    <BeaverPet
      ref={beaver}
      mood={mood}
      outfit={looks ? looks[look] : outfit}
      activity={activity}
      withCatalog={false}
      className={cn("pointer-events-auto [&_.beaver-speech]:hidden", className)}
    />
  );
}
