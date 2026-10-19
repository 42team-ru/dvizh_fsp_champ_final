import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import beaverSvg from "./beaver.svg?raw";
import { createBeaverRig, type BeaverRig, type ReactOptions } from "./beaver-rig";
import { buildSlots, SLOTS, type BeaverActivity, type BeaverOutfit } from "./beaver-wardrobe";
import "./beaver-pet.css";

export type BeaverMood = "idle" | "happy" | "surprised" | "thinking" | "sad" | "wink" | "offended" | "sleep";

/** Управление бобром снаружи: сыграть эмоцию, которая сама сбросится к базовому настроению. */
export type BeaverPetHandle = { react(mood: BeaverMood, opts?: ReactOptions): void };

type Props = {
  /** Базовое настроение: держится, пока не сменят. Короткие эмоции — через ref.react(). */
  mood?: BeaverMood;
  ref?: Ref<BeaverPetHandle>;
  /** Что надето: головной убор или наушники, очки, одежда, экипировка, вещь на шее. */
  outfit?: BeaverOutfit;
  /** Инвентарь рядом или в лапах: мяч, гантели, шахматы, лыжи, хоккей, ноутбук. */
  activity?: BeaverActivity;
  /** Глаза следят за курсором. */
  followCursor?: boolean;
  className?: string;
  onClick?: () => void;
};

/** Анимированный маскот-бобр. Настроение, наряд и активность задаются пропсами, движение считает beaver-rig. */
export function BeaverPet({ mood = "idle", outfit = {}, activity = "none", followCursor = true, className, onClick, ref: handleRef }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rig = useRef<BeaverRig | null>(null);
  const outfitKey = JSON.stringify(outfit);

  useImperativeHandle(handleRef, () => ({ react: (m, opts) => rig.current?.react(m, opts) }), []);

  useEffect(() => {
    if (!ref.current) return;
    rig.current = createBeaverRig(ref.current, followCursor);
    return () => rig.current?.destroy();
  }, [followCursor]);

  useEffect(() => {
    rig.current?.setMood(mood);
  }, [mood]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const content = buildSlots(JSON.parse(outfitKey) as BeaverOutfit, activity);
    for (const id of SLOTS) {
      const slot = root.querySelector(`#${id}`);
      if (slot) slot.innerHTML = content[id] ?? "";
    }
    rig.current?.setActivity(activity);
  }, [outfitKey, activity]);

  return (
    <div
      ref={ref}
      className={`beaver-pet ${className ?? ""}`}
      role="button"
      tabIndex={0}
      aria-label="Бобр: потрогать"
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          rig.current?.poke(ref.current?.querySelector("#head") ?? null);
          onClick?.();
        }
      }}
      onClick={(event) => {
        // Реакция зависит от того, куда ткнули: нос, голова, живот, хвост, лапы.
        rig.current?.poke(event.target instanceof Element ? event.target : null);
        onClick?.();
      }}
      dangerouslySetInnerHTML={{ __html: beaverSvg }}
    />
  );
}
