import { usePetsGetMine } from "@/shared/api/generated/core/pets/pets";
import { BeaverPet } from "./beaver-pet";
import type { BeaverActivity, BeaverOutfit } from "./beaver-wardrobe";

/** Личный питомец для карточки профиля; ошибка API оставляет спокойного бобра. */
export function MyBeaverPet({ className, speechContainer }: { className?: string; speechContainer: HTMLElement | null }) {
  const query = usePetsGetMine();
  const pet = query.isError ? undefined : query.data?.data;
  if (query.isPending) return <div className={`${className ?? ""} animate-pulse rounded-3xl bg-white/40`} role="status" aria-label="Загружаем питомца" />;
  return (
    <BeaverPet
      className={className}
      mood={pet?.mood}
      outfit={pet?.outfit as BeaverOutfit | undefined}
      activity={pet?.activity as BeaverActivity | undefined}
      say={pet?.status?.message}
      sayHref={pet?.status?.eventId ? `/events/${pet.status.eventId}` : undefined}
      speechContainer={speechContainer}
    />
  );
}
