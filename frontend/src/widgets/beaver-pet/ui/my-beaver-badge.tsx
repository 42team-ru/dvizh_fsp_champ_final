import { useEffect, useId, useMemo, useRef, useState } from "react";
import beaverSvg from "./beaver.svg?raw";
import { usePetsCatalog, usePetsGetMine } from "@/shared/api/generated/core/pets/pets";
import { buildSlots, SLOTS, type BeaverActivity, type BeaverArts, type BeaverOutfit } from "./beaver-wardrobe";
import { scopeSvgIds, svgResourceIds } from "./scope-svg-ids";

const baseReferenceIds = new Set([...svgResourceIds(beaverSvg), "head-outline"]);

/**
 * Застывшие кадры анимации «помахать» (повороты в градусах вокруг тех же точек, что в beaver-rig).
 * Без `pose` кадр выбирается случайно при каждом показе.
 */
const POSES = {
  hello: { armRight: -86, head: -5, mouth: 0 },
  cheer: { armRight: -58, head: 6, mouth: 0.55 },
  high: { armRight: -100, head: -8, mouth: 0.35 },
  low: { armRight: -44, head: 3, mouth: 0.2 },
} as const;
export type BeaverPose = keyof typeof POSES;
const POSE_IDS = Object.keys(POSES) as BeaverPose[];

const rotate = (deg: number, x: number, y: number) => `rotate(${deg} ${x} ${y})`;

/**
 * Статичная картинка бобра хозяина для подсказок и карточек: тот же рисунок и тот же наряд, что в профиле,
 * но без анимации, реплик и реакции на клики. Пока наряд грузится — бобр без вещей.
 */
export function MyBeaverBadge({ className, pose: fixed }: { className?: string; pose?: BeaverPose }) {
  const [random] = useState(() => POSE_IDS[Math.floor(Math.random() * POSE_IDS.length)]);
  const pose = fixed ?? random;
  const instanceId = useId();
  const prefix = `beaver-badge-${instanceId.replace(/[^a-zA-Z0-9_-]/g, (c) => `_${c.codePointAt(0)!.toString(16)}_`)}`;
  const scoped = useMemo(() => scopeSvgIds(beaverSvg, prefix, baseReferenceIds), [prefix]);
  const ref = useRef<HTMLDivElement>(null);
  const pet = usePetsGetMine();
  const catalog = usePetsCatalog({ query: { staleTime: 5 * 60_000 } });
  const data = pet.isError ? undefined : pet.data?.data;
  const outfitKey = JSON.stringify(data?.outfit ?? {});
  const activity = (data?.activity ?? "none") as BeaverActivity;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // вещи от админа рисуются по каталогу, встроенные знает гардероб
    const arts: BeaverArts = {};
    for (const s of catalog.data?.data.slots ?? []) {
      for (const item of s.items) if (item.art) arts[`${s.id}:${item.id}`] = item.art;
    }
    const content = buildSlots(JSON.parse(outfitKey) as BeaverOutfit, activity, arts);
    const refs = new Set([...baseReferenceIds, ...svgResourceIds(Object.values(content).join(""))]);
    for (const id of SLOTS) {
      const slot = root.querySelector(`#${id}`);
      if (slot) slot.innerHTML = scopeSvgIds(content[id] ?? "", prefix, refs);
    }
    const frame = POSES[pose];
    root.querySelector("#arm-right")?.setAttribute("transform", rotate(frame.armRight, 272, 320));
    root.querySelector("#head")?.setAttribute("transform", rotate(frame.head, 188, 288));
    const mouth = root.querySelector("#mouth-open");
    mouth?.setAttribute("opacity", frame.mouth ? "1" : "0");
    mouth?.setAttribute("transform", `translate(187.5 236) scale(1 ${frame.mouth || 0.01}) translate(-187.5 -236)`);
  }, [outfitKey, activity, catalog.data, prefix, pose]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none [&_svg]:size-full [&_svg]:overflow-visible ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: scoped }}
    />
  );
}
