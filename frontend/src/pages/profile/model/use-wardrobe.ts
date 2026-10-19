import { usePetsCatalog, usePetsGetMine } from "@/shared/api/generated/core/pets/pets";
import { usePublicProfile } from "./public-profile";

/** Что сейчас надето на бобре: подпись слота и вещи из каталога, по порядку конструктора. В чужом профиле — на его бобре. */
export function useWardrobe() {
  const owner = usePublicProfile();
  const pet = usePetsGetMine({ query: { enabled: !owner } });
  const catalog = usePetsCatalog({ query: { staleTime: 5 * 60_000 } });
  const mine = owner ? owner.pet : pet.data?.status === 200 ? pet.data.data : undefined;
  const slots = catalog.data?.status === 200 ? catalog.data.data.slots : [];
  const worn = slots.flatMap((slot) => {
    const code = slot.kind === "ACTIVITY" ? mine?.activity : mine?.outfit[slot.id];
    const item = code && code !== "none" ? slot.items.find((i) => i.id === code) : undefined;
    return item ? [{ slot: slot.label, item: item.label }] : [];
  });
  return { worn, isLoading: (!owner && pet.isPending) || catalog.isPending };
}
