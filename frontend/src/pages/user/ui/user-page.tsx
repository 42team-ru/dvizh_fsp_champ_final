import { useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { useUser } from "@/entity/user/model/use-user";
import { useUsersGet } from "@/shared/api/generated/core/users/users";
import { usePetsGetUser } from "@/shared/api/generated/core/pets/pets";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { ProfileGallery } from "@/widgets/profile-gallery/ui/profile-gallery";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { BeaverPet } from "@/widgets/beaver-pet/ui/beaver-pet";
import type { BeaverActivity, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";
import { dateShort } from "@/pages/profile/ui/passport-utils";
import { plural } from "@/pages/profile/model/use-profile";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Eyebrow } from "@/shared/components/ui/eyebrow";

const SPORT_TONES = ["bg-sky-soft", "bg-lime-soft", "bg-peach"];

/** Чужой профиль: те же данные, что в своём, но только для просмотра. */
export default function UserPage() {
  const { id = "" } = useParams();
  const { user: me } = useUser();
  const [speechContainer, setSpeechContainer] = useState<HTMLDivElement | null>(null);
  const profile = useUsersGet(id, { query: { enabled: Boolean(id), retry: false } });
  const petQuery = usePetsGetUser(id, { query: { enabled: Boolean(id), retry: false } });

  if (me?.id && me.id === id) return <Navigate to="/profile" replace />;

  const user = profile.data?.status === 200 ? profile.data.data : undefined;
  const pet = petQuery.data?.status === 200 ? petQuery.data.data : undefined;
  const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username : "";

  return (
    <div className="relative isolate min-h-dvh overflow-clip bg-background pb-[110px] lg:pb-12">
      <MemphisBackground seed="user" />
      <div className="hidden lg:block">
        <AppHeader current="feed" />
      </div>
      <main className="mx-auto flex w-full max-w-[960px] flex-col gap-4 px-4 pt-4 lg:gap-6 lg:px-8 lg:pt-8">
        {profile.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">Загружаем профиль…</p>
        ) : !user ? (
          <Card className="gap-3 p-6">
            <h1 className="font-display text-xl font-bold">Профиль не найден</h1>
            <p className="text-sm text-muted-foreground">Возможно, ссылка устарела.</p>
            <Button asChild variant="soft" className="self-start"><Link to="/feed">К ленте</Link></Button>
          </Card>
        ) : (
          <>
            <Card className="gap-4 p-5 lg:p-6">
              <div className="flex items-center gap-4">
                <UserAvatar
                  user={user}
                  className="box-border size-20 shrink-0 rounded-full border-2 border-ink object-cover lg:size-24"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h1 className="font-display text-xl leading-tight font-bold text-foreground lg:text-[28px]">{fullName}</h1>
                  <p className="text-sm font-medium text-muted-foreground">
                    {[`@${user.username}`, user.city].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {user.attendedCount} {plural(user.attendedCount, ["посещение", "посещения", "посещений"])}
                  </p>
                </div>
              </div>
              {user.bio && <p className="text-sm leading-5 font-medium text-foreground">{user.bio}</p>}
              {user.sports.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {user.sports.map((s, i) => (
                    <span
                      key={s.sport.id}
                      className={`rounded-pill border-[1.5px] border-ink px-3.5 py-1.5 text-[13px] font-extrabold whitespace-nowrap text-foreground ${SPORT_TONES[i % SPORT_TONES.length]}`}
                    >
                      {s.sport.name}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {pet && (
              <Card className="flex-row flex-wrap items-center gap-4 bg-sky p-5 lg:p-6">
                <BeaverPet
                  className="size-32 shrink-0 [&_.beaver-pet]:h-full [&_svg]:h-full"
                  mood={pet.mood}
                  outfit={pet.outfit as BeaverOutfit | undefined}
                  activity={pet.activity as BeaverActivity | undefined}
                  speechContainer={speechContainer}
                />
                <div className="flex min-w-[180px] flex-1 flex-col gap-1">
                  <Eyebrow>ПИТОМЕЦ</Eyebrow>
                  <p className="font-display text-xl font-bold text-foreground">{pet.name}</p>
                </div>
                <div ref={setSpeechContainer} className="relative h-[72px] w-full" />
              </Card>
            )}

            <ProfileGallery owner={{ ...user, id }} mine={false} aboutPhotos={user.photos} />

            {user.events.length > 0 && (
              <Card className="gap-3 p-5 lg:p-6">
                <h2 className="font-display text-lg font-bold lg:text-[22px]">Ближайшие встречи</h2>
                {user.events.map((e) => (
                  <Link
                    key={e.id}
                    to={`/events/${e.id}`}
                    className="flex flex-col gap-0.5 rounded-2xl border-2 border-ink bg-card px-4 py-3"
                  >
                    <span className="text-[15px] font-extrabold text-foreground">{e.title}</span>
                    <span className="text-xs font-bold text-muted-foreground">
                      {e.sport.name} · {dateShort(e.startAt)}
                    </span>
                  </Link>
                ))}
              </Card>
            )}
          </>
        )}
      </main>
      <div className="lg:hidden">
        <MobileTabBar current="feed" />
      </div>
    </div>
  );
}
