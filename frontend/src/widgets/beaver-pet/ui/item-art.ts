import beaverSvg from "./beaver.svg?raw";
import {
  buildSlots,
  SLOTS,
  type BeaverActivity,
  type BeaverArts,
  type BeaverOutfit,
} from "./beaver-wardrobe";

const definitions = beaverSvg.match(/<defs>([\s\S]*?)<\/defs>/)?.[1] ?? "";

/** Only the item's drawing, composed across all rig slots; the beaver itself is never included. */
export function itemArt(slot: string, code: string, arts: BeaverArts = {}) {
  const content = buildSlots(
    slot === "activity" ? {} : ({ [slot]: code } as BeaverOutfit),
    (slot === "activity" ? code : "none") as BeaverActivity,
    arts,
  );
  let drawing = SLOTS.map((id) => {
    const part = content[id] ?? "";
    if (!part) return "";
    // Bring paired small objects together for a readable tile; keep every component.
    if (slot === "paws" || (slot === "activity" && code === "lift")) {
      const distance = slot === "activity" ? 75 : 90;
      const shift = id.endsWith("left")
        ? distance
        : id.endsWith("right")
          ? -distance
          : 0;
      return `<g transform="translate(${shift} 0)">${part}</g>`;
    }
    if (slot === "bottom" && code === "hockeypants" && id === "slot-feet")
      return `<g transform="translate(0 38)">${part}</g>`;
    return part;
  }).join("");
  // These uses redraw the animal's outline in the animated rig, not part of the item.
  drawing = drawing.replace(/<use\s+href="#head-outline"\s*\/>/g, "");
  if (slot === "bottom")
    drawing = drawing.replace(/<use\s+href="#body-line"\s*\/>/g, "");
  return `<defs>${definitions}</defs><g data-item-art="true">${drawing}</g>`;
}
