import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePetsCatalog } from "@/shared/api/generated/core/pets/pets";
import { cn } from "cn";
import { itemArt } from "./item-art";
import { scopeSvgIds, svgResourceIds } from "./scope-svg-ids";
import type { BeaverArts } from "./beaver-wardrobe";
import bounds from "./item-bounds.json";

export const slotTone = (slot: string) =>
  ({
    hat: "bg-peach",
    eyewear: "bg-lime-soft",
    neck: "bg-mint-soft",
    shirt: "bg-lavender-soft",
    activity: "bg-sky-soft",
    prop: "bg-lime-soft",
    paws: "bg-peach",
    bottom: "bg-peach",
    feet: "bg-mint-soft",
  })[slot] ?? "bg-lavender-soft";
const measured = new Map<string, string>();

/** A padded, centred item in its own SVG. Built-ins have offline alpha bounds; custom art is measured once. */
export function ItemThumb({
  slot,
  code,
  className,
  plain = false,
}: {
  slot: string;
  code: string;
  className?: string;
  plain?: boolean;
}) {
  const id = useId().replace(/[^\w-]/g, "");
  const catalog = usePetsCatalog({ query: { staleTime: 5 * 60_000 } });
  const arts = useMemo(() => {
    const result: BeaverArts = {};
    for (const s of catalog.data?.data.slots ?? [])
      for (const item of s.items)
        if (item.art) result[`${s.id}:${item.id}`] = item.art;
    return result;
  }, [catalog.data]);
  const key = `${slot}:${code}`;
  const markup = useMemo(() => {
    const art = itemArt(slot, code, arts);
    const ids = new Set([
      ...svgResourceIds(art),
      ...Array.from(
        art.matchAll(/\bid=["']([^"']+)["']/g),
        (match) => match[1],
      ),
    ]);
    return scopeSvgIds(art, `thumb-${id}`, ids);
  }, [slot, code, arts, id]);
  const cachedKey = `${key}:${JSON.stringify(arts[key] ?? null)}`;
  const known = !arts[key]
    ? (bounds as Record<string, string>)[key]
    : undefined;
  const [box, setBox] = useState<string>();
  const svg = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    if (known) return;
    const cached = measured.get(cachedKey);
    if (cached) {
      setBox(cached);
      return;
    }
    const group = svg.current?.querySelector<SVGGElement>("[data-item-art]");
    if (!group) return;
    const b = group.getBBox();
    if (!b.width || !b.height) return;
    const padding = Math.max(b.width, b.height) * 0.1 + 4;
    const next = `${b.x - padding} ${b.y - padding} ${b.width + padding * 2} ${b.height + padding * 2}`;
    measured.set(cachedKey, next);
    setBox(next);
  }, [cachedKey, markup, known]);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[10px]",
        !plain && slotTone(slot),
        className,
      )}
    >
      <svg
        ref={svg}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={known ?? box ?? "-150 -150 900 900"}
        className="block size-full p-[8%]"
        preserveAspectRatio="xMidYMid meet"
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </span>
  );
}
