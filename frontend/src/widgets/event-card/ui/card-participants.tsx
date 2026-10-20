import { useMemo, type ComponentProps } from "react";
import { Participants as ParticipantsLayout } from "@/shared/components/ui/participants";
import { usePetsCatalog } from "@/shared/api/generated/core/pets/pets";
import { StaticBeaver } from "@/widgets/beaver-pet/ui/static-beaver";
import type { BeaverActivity, BeaverArts, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";

/** Головы участников: общий каталог Orval кешируется для всех карточек страницы. */
export function Participants(props: Omit<ComponentProps<typeof ParticipantsLayout>, "renderBeaver">) {
  const catalog = usePetsCatalog({ query: {
    staleTime: 5 * 60_000,
    enabled: props.people.some((person) => !person.avatarUrl),
  } });
  const arts = useMemo(() => {
    const result: BeaverArts = {};
    for (const slot of catalog.data?.data.slots ?? []) {
      for (const item of slot.items) if (item.art) result[`${slot.id}:${item.id}`] = item.art;
    }
    return result;
  }, [catalog.data]);
  return <ParticipantsLayout {...props} renderBeaver={(person) => (
    <StaticBeaver outfit={person.pet?.outfit as BeaverOutfit | undefined}
      activity={person.pet?.activity as BeaverActivity | undefined} arts={arts}
      className="absolute -top-0.5 -left-1.5 h-[43px] w-12" />
  )} />;
}
