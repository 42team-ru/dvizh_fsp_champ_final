import { useEffect, useId, useMemo, useRef } from "react";
import beaverSvg from "./beaver.svg?raw";
import { usePetsCatalog } from "@/shared/api/generated/core/pets/pets";
import { buildSlots, SLOTS, type BeaverActivity, type BeaverArts, type BeaverOutfit } from "./beaver-wardrobe";
import { scopeSvgIds, svgResourceIds } from "./scope-svg-ids";

const baseReferenceIds = new Set([...svgResourceIds(beaverSvg), "head-outline"]);

/** Исходная область рисунка бобра: x, y, ширина, высота. */
const VIEW = { x: -10, y: -20, w: 490, h: 435 };

/**
 * Одна вещь без бобра: рисуем бобра, прячем всё тело и оставляем видимыми только слоты вещи,
 * затем подгоняем область просмотра под её габариты.
 */
export function BeaverItemPreview({ slot, code, className }: { slot: string; code: string; className?: string }) {
  const instanceId = useId();
  const prefix = `beaver-prev-${instanceId.replace(/[^a-zA-Z0-9_-]/g, (c) => `_${c.codePointAt(0)!.toString(16)}_`)}`;
  const scoped = useMemo(() => scopeSvgIds(beaverSvg, prefix, baseReferenceIds), [prefix]);
  const ref = useRef<HTMLDivElement>(null);
  const catalog = usePetsCatalog({ query: { staleTime: 5 * 60_000 } });
  const arts = useMemo(() => {
    const map: BeaverArts = {};
    for (const s of catalog.data?.data.slots ?? []) {
      for (const item of s.items) if (item.art) map[`${s.id}:${item.id}`] = item.art;
    }
    return map;
  }, [catalog.data]);

  useEffect(() => {
    const root = ref.current;
    const svg = root?.querySelector("svg");
    if (!root || !svg) return;
    const isActivity = slot === "activity";
    const outfit: BeaverOutfit = isActivity ? {} : { [slot]: code };
    const content = buildSlots(outfit, (isActivity ? code : "none") as BeaverActivity, arts);
    const refs = new Set([...baseReferenceIds, ...svgResourceIds(Object.values(content).join(""))]);
    svg.setAttribute("viewBox", `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`);
    const filled: Element[] = [];
    for (const id of SLOTS) {
      const el = root.querySelector(`#${id}`);
      if (!el) continue;
      el.innerHTML = scopeSvgIds(content[id] ?? "", prefix, refs);
      if (content[id]) {
        (el as SVGElement).style.visibility = "visible";
        filled.push(el);
      }
    }
    // Габариты вещей в экранных координатах → в координаты рисунка → квадратная область с полями.
    const box = svg.getBoundingClientRect();
    const scale = Math.min(box.width / VIEW.w, box.height / VIEW.h);
    if (filled.length === 0 || !scale) return;
    const rects = filled.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
    if (rects.length === 0) return;
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const offX = (box.width - VIEW.w * scale) / 2;
    const offY = (box.height - VIEW.h * scale) / 2;
    const toX = (px: number) => VIEW.x + (px - box.left - offX) / scale;
    const toY = (py: number) => VIEW.y + (py - box.top - offY) / scale;
    const cx = (toX(left) + toX(right)) / 2;
    const cy = (toY(top) + toY(bottom)) / 2;
    const side = Math.max(toX(right) - toX(left), toY(bottom) - toY(top)) * 1.08;
    svg.setAttribute("viewBox", `${cx - side / 2} ${cy - side / 2} ${side} ${side}`);
  }, [slot, code, arts, prefix]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none [&_svg]:size-full [&_svg]:overflow-visible [&_svg]:[visibility:hidden] [&_defs]:[visibility:visible] ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: scoped }}
    />
  );
}
