import { create } from "zustand";
import type {
  PetRequest,
  ShopItemResponse,
  ShopBundleResponse,
} from "@/shared/api/generated/core/appAPI.schemas";

export type Look = PetRequest;
export const emptyLook = (): Look => ({ activity: "none", outfit: {} });
export const matchesLook = (item: ShopItemResponse, look: Look) =>
  item.slot === "activity"
    ? item.code === look.activity
    : item.code === look.outfit[item.slot];
export const lookItems = (items: ShopItemResponse[], look: Look) =>
  items.filter(
    (item) => item.id !== "activity:none" && matchesLook(item, look),
  );
export const toggleItem = (look: Look, item: ShopItemResponse): Look => {
  if (item.slot === "activity")
    return {
      ...look,
      outfit: { ...look.outfit },
      activity: matchesLook(item, look) ? "none" : item.code,
    };
  const outfit = { ...look.outfit };
  if (matchesLook(item, look)) delete outfit[item.slot];
  else outfit[item.slot] = item.code;
  return { ...look, outfit };
};
export const onlyOwned = (bundle: ShopBundleResponse): Look => ({
  activity:
    bundle.items.find((item) => item.slot === "activity" && item.owned)?.code ??
    "none",
  outfit: Object.fromEntries(
    bundle.items
      .filter((item) => item.slot !== "activity" && item.owned)
      .map((item) => [item.slot, item.code]),
  ),
});
export const setPrice = (items: ShopItemResponse[]) => {
  const missing = items.filter((item) => !item.owned);
  const full = missing.reduce((sum, item) => sum + item.price, 0);
  return {
    full,
    price: missing.length >= 2 ? Math.floor(full * 0.8) : full,
    missing,
  };
};

/** One-shot handoff from a wardrobe bundle to the shop. Try-on itself stays local to the page. */
export const useShopHandoff = create<{
  look: Look | null;
  set(look: Look | null): void;
}>((set) => ({ look: null, set: (look) => set({ look }) }));

export const slotGroups = [
  { id: "all", label: "Всё", slots: [] },
  { id: "head", label: "Голова", slots: ["hat"] },
  { id: "eyes", label: "Глаза", slots: ["eyewear"] },
  { id: "neck", label: "Шея", slots: ["neck"] },
  { id: "torso", label: "Торс", slots: ["shirt"] },
  { id: "paw", label: "Лапа", slots: ["activity", "paws", "prop"] },
  { id: "legs", label: "Ноги", slots: ["bottom", "feet"] },
  { id: "background", label: "Фон", slots: ["background"] },
];
export const groupOf = (slot: string) =>
  slotGroups.find((group) => group.slots.includes(slot));
export const isTeamBundle = (bundle: ShopBundleResponse) =>
  Boolean(bundle.outfit.shirt && teamCodes.has(bundle.outfit.shirt));
const teamCodes = new Set([
  "zenit",
  "cska",
  "fakel",
  "yenisey",
  "krasnodar",
  "lokomotiv",
  "spartak",
  "rostov",
  "dynamo",
  "akron",
  "beavers",
  "hc-cska",
  "hc-metallurg",
  "hc-lokomotiv",
  "hc-severstal",
  "hc-torpedo",
  "hc-barys",
  "hc-spartak",
  "hc-neftekhimik",
  "hc-sokol",
]);
