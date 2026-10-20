import { memo, useId, useMemo } from "react";
import beaverSvg from "./beaver.svg?raw";
import { buildSlots, type BeaverActivity, type BeaverArts, type BeaverOutfit } from "./beaver-wardrobe";
import { scopeSvgIds } from "./scope-svg-ids";

const EMPTY_OUTFIT: BeaverOutfit = {};
const EMPTY_ARTS: BeaverArts = {};

type Props = {
  outfit?: BeaverOutfit;
  activity?: BeaverActivity;
  arts?: BeaverArts;
  className?: string;
};

/** Статичный рисунок: без рига, подписок, таймеров и слежения за курсором. */
export const StaticBeaver = memo(function StaticBeaver({ outfit = EMPTY_OUTFIT, activity = "none", arts = EMPTY_ARTS, className }: Props) {
  const id = useId();
  const outfitKey = JSON.stringify(outfit);
  const svg = useMemo(() => {
    const slots = buildSlots(JSON.parse(outfitKey) as BeaverOutfit, activity, arts);
    const markup = beaverSvg.replace(/<g id="(slot-[\w-]+)"><\/g>/g,
      (_, slot: keyof typeof slots) => `<g id="${slot}">${slots[slot] ?? ""}</g>`);
    // Статичному рисунку не нужны исходные id рига: изолируем также все структурные элементы и вещи.
    const ids = new Set([...markup.matchAll(/\bid\s*=\s*(["'])(.*?)\1/g)].map((match) => match[2]));
    const prefix = `static-beaver-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    return scopeSvgIds(markup, prefix, ids);
  }, [outfitKey, activity, arts, id]);

  return <div aria-hidden="true" className={`pointer-events-none [&>svg]:block [&>svg]:size-full ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: svg }} />;
});
