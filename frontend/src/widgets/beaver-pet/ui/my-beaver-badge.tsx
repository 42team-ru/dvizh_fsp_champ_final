import { useEffect, useId, useMemo, useRef, useState } from "react";
import beaverSvg from "./beaver.svg?raw";
import { BACKGROUND_VIEWBOX, BEAVER_VIEWBOX } from "./beaver-backgrounds";
import { usePetsCatalog, usePetsGetMine } from "@/shared/api/generated/core/pets/pets";
import { buildSlots, SLOTS, type BeaverActivity, type BeaverArts, type BeaverOutfit } from "./beaver-wardrobe";
import { scopeSvgIds, svgResourceIds } from "./scope-svg-ids";

const baseReferenceIds = new Set([...svgResourceIds(beaverSvg), "head-outline"]);

/**
 * Застывшие кадры (повороты в градусах вокруг тех же точек, что в beaver-rig; лапа влево — плюс, вправо — минус).
 * hello/cheer/high/low — кадры взмаха; think — «ну и где все?»: левая лапа у подбородка, правая разведена в сторону.
 * Без `pose` случайно берётся один из кадров взмаха.
 */
const POSES = {
  hello: { armLeft: 0, armRight: -86, head: -5, mouth: 0 },
  cheer: { armLeft: 0, armRight: -58, head: 6, mouth: 0.55 },
  high: { armLeft: 0, armRight: -100, head: -8, mouth: 0.35 },
  low: { armLeft: 0, armRight: -44, head: 3, mouth: 0.2 },
  think: { armLeft: -124, armRight: -52, head: 5, mouth: 0.15 },
} as const;
export type BeaverPose = keyof typeof POSES;
const WAVE_POSES: BeaverPose[] = ["hello", "cheer", "high", "low"];

const rotate = (deg: number, x: number, y: number) => `rotate(${deg} ${x} ${y})`;

/**
 * Статичная картинка бобра хозяина для подсказок и карточек: тот же рисунок и тот же наряд, что в профиле,
 * но без анимации, реплик и реакции на клики. Пока наряд грузится — бобр без вещей.
 */
export function MyBeaverBadge({ className, pose: fixed }: { className?: string; pose?: BeaverPose }) {
  const [random] = useState(() => WAVE_POSES[Math.floor(Math.random() * WAVE_POSES.length)]);
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
    root.querySelector("svg")?.setAttribute("viewBox", content["slot-background"] ? BACKGROUND_VIEWBOX : BEAVER_VIEWBOX);
    const refs = new Set([...baseReferenceIds, ...svgResourceIds(Object.values(content).join(""))]);
    for (const id of SLOTS) {
      const slot = root.querySelector(`#${id}`);
      if (slot) slot.innerHTML = scopeSvgIds(content[id] ?? "", prefix, refs);
    }
    const frame = POSES[pose];
    const armLeft = root.querySelector("#arm-left");
    armLeft?.setAttribute("transform", rotate(frame.armLeft, 102, 320));
    // лапа у подбородка рисуется поверх головы — как в beaver-rig
    if (frame.armLeft < -45) root.querySelector("#head")?.after(armLeft!);
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
