import { useState } from "react";
import { ShareDialog } from "@/features/share-link/ui/share-dialog";
import { SharePassport } from "@/features/share-link/ui/share-posters";
import { Button } from "@/shared/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { cn } from "cn";
import { handle } from "@/shared/lib/handle";
import {
  useUsersHistorySummary,
  useUsersMySports,
} from "@/shared/api/generated/core/users/users";
import {
  usePetsCatalog,
  usePetsGetMine,
} from "@/shared/api/generated/core/pets/pets";
import { StaticBeaver } from "@/widgets/beaver-pet/ui/static-beaver";
import type {
  BeaverActivity,
  BeaverArts,
  BeaverOutfit,
} from "@/widgets/beaver-pet/ui/beaver-wardrobe";
import { usePublicProfile } from "../model/public-profile";
import { useAchievements } from "../model/use-achievements";
import { mrzLines } from "./passport-utils";

type ProfileUser = {
  id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  city?: string;
  createdAt?: string;
};

/** Поделиться своим или чужим паспортом, не меняя публичную ссылку профиля. */
export function ProfileShare({
  user,
  className,
}: {
  user?: ProfileUser | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!user?.id) return null;
  return (
    <>
      <Button
        variant="secondary"
        className={cn("h-11 px-4 text-sm", className)}
        onClick={() => setOpen(true)}
      >
        <ArrowUpRight className="size-[18px]" />
        Поделиться
      </Button>
      {open && <ProfileShareDialog user={user} onOpenChange={setOpen} />}
    </>
  );
}

function ProfileShareDialog({
  user,
  onOpenChange,
}: {
  user: ProfileUser;
  onOpenChange(open: boolean): void;
}) {
  const owner = usePublicProfile();
  const options = { query: { enabled: !owner } };
  const summary = useUsersHistorySummary({}, options);
  const sports = useUsersMySports(options);
  const petQuery = usePetsGetMine(options);
  const catalog = usePetsCatalog({ query: { staleTime: 5 * 60_000 } });
  const arts: BeaverArts = {};
  for (const slot of catalog.data?.data.slots ?? []) {
    for (const item of slot.items)
      if (item.art) arts[`${slot.id}:${item.id}`] = item.art;
  }
  const { query: achievements, earnedCount } = useAchievements();
  const pet = owner
    ? owner.pet
    : petQuery.data?.status === 200
      ? petQuery.data.data
      : undefined;
  const ready =
    achievements.data?.status === 200 &&
    catalog.data?.status === 200 &&
    (owner
      ? Boolean(owner.pet)
      : summary.data?.status === 200 &&
        sports.data?.status === 200 &&
        petQuery.data?.status === 200);
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Спортсмен";
  const stats = [
    {
      value: owner
        ? owner.user.attendedCount
        : summary.data?.status === 200
          ? summary.data.data.total
          : "—",
      label: "встреч",
    },
    {
      value: owner
        ? owner.user.sports.length
        : sports.data?.status === 200
          ? sports.data.data.length
          : "—",
      label: "видов спорта",
    },
    {
      value: achievements.data?.status === 200 ? earnedCount : "—",
      label: "достижений",
    },
  ];
  return (
    <ShareDialog
      open
      onOpenChange={onOpenChange}
      path={`/users/${user.id}`}
      title="Поделиться паспортом"
      filename={`passport-${user.username || user.id}`}
      ready={ready}
      description="Обложка паспорта с бобром и твоими спортивными историями — для сторис и чатов. По QR и ссылке откроется профиль."
    >
      {(format) => (
        <SharePassport
          path={`/users/${user.id}`}
          name={name}
          format={format}
          stats={stats}
          mrz={mrzLines(user)[0]}
          handle={[user.username && handle(user.username), user.city]
            .filter(Boolean)
            .join(" · ")}
          emblem={
            <StaticBeaver
              arts={arts}
              outfit={pet?.outfit as BeaverOutfit | undefined}
              activity={pet?.activity as BeaverActivity | undefined}
              className="absolute top-[-3%] left-[-14%] h-[175%] w-[175%]"
            />
          }
        />
      )}
    </ShareDialog>
  );
}
