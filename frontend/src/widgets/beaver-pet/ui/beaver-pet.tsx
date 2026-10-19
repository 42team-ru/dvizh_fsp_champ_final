import { useEffect, useRef } from "react";
import beaverSvg from "./beaver.svg?raw";
import { createBeaverRig, type BeaverRig } from "./beaver-rig";
import { buildSlots, SLOTS, type BeaverActivity, type BeaverOutfit } from "./beaver-wardrobe";
import "./beaver-pet.css";

export type BeaverMood = "idle" | "happy" | "sad" | "thinking";

type Props = {
  mood?: BeaverMood;
  /** Что надето: шапка, очки, футболка, вещь на шее. */
  outfit?: BeaverOutfit;
  /** Чем занят: чеканит мяч, ведёт баскетбольный, поднимает гантели, думает над шахматами. */
  activity?: BeaverActivity;
  /** Глаза следят за курсором. */
  followCursor?: boolean;
  className?: string;
  onClick?: () => void;
};

/** Анимированный маскот-бобр. Настроение, наряд и активность задаются пропсами, движение считает beaver-rig. */
export function BeaverPet({ mood = "idle", outfit = {}, activity = "none", followCursor = true, className, onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rig = useRef<BeaverRig | null>(null);
  const outfitKey = JSON.stringify(outfit);

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
      onClick={() => {
        rig.current?.hop();
        onClick?.();
      }}
      dangerouslySetInnerHTML={{ __html: beaverSvg }}
    />
  );
}
