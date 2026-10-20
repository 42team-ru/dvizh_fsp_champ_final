import { useMemo } from "react";
import { Participants as ParticipantsLayout } from "@/shared/components/ui/participants";
import { usePetsCatalog, usePetsGetUser } from "@/shared/api/generated/core/pets/pets";
import type { AvatarPet } from "@/shared/components/ui/user-avatar";
import { StaticBeaver } from "@/widgets/beaver-pet/ui/static-beaver";
import type { BeaverActivity, BeaverArts, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";

/** Бобр участника вместо фото: общий каталог Orval кешируется для всех аватаров страницы. */
export function ParticipantBeaver({ pet, className }: { pet?: AvatarPet | null; className?: string }) {
  const catalog = usePetsCatalog({ query: {
    staleTime: 5 * 60_000,
    enabled: Object.keys(pet?.outfit ?? {}).length > 0,
  } });
  const arts = useMemo(() => {
    const result: BeaverArts = {};
    for (const slot of catalog.data?.data.slots ?? []) {
      for (const item of slot.items) if (item.art) result[`${slot.id}:${item.id}`] = item.art;
    }
    return result;
  }, [catalog.data]);
  return (
    <StaticBeaver outfit={(pet?.outfit ?? undefined) as BeaverOutfit | undefined}
      activity={(pet?.activity ?? undefined) as BeaverActivity | undefined} arts={arts}
      className={className} />
  );
}

/** Бобр человека для аватара: образ из ответа, а если его там нет — по id (кешируется на человека). */
export function UserBeaver({ userId, pet, className }: { userId?: string; pet?: AvatarPet | null; className?: string }) {
  const own = usePetsGetUser(userId ?? "", { query: {
    staleTime: 5 * 60_000,
    retry: false,
    enabled: !pet && Boolean(userId),
  } });
  const loaded = own.data?.status === 200 ? own.data.data : undefined;
  return <ParticipantBeaver pet={pet ?? loaded} className={className} />;
}

/** Головы участников в карточке ленты: те же аватарки, что везде (фото или бобр). */
export const Participants = ParticipantsLayout;
