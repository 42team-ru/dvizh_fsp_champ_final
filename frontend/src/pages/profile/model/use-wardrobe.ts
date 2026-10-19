import { usePetsCatalog, usePetsGetMine } from "@/shared/api/generated/core/pets/pets";

/** Что сейчас надето на бобре: подпись слота и вещи из каталога, по порядку конструктора. */
export function useWardrobe() {
  const pet = usePetsGetMine();
  const catalog = usePetsCatalog({ query: { staleTime: 5 * 60_000 } });
  const mine = pet.data?.status === 200 ? pet.data.data : undefined;
  const slots = catalog.data?.status === 200 ? catalog.data.data.slots : [];
  const worn = slots.flatMap((slot) => {
    const code = slot.kind === "ACTIVITY" ? mine?.activity : mine?.outfit[slot.id];
    const item = code && code !== "none" ? slot.items.find((i) => i.id === code) : undefined;
    return item ? [{ slot: slot.label, item: item.label }] : [];
  });
  return { worn, isLoading: pet.isPending || catalog.isPending };
}
