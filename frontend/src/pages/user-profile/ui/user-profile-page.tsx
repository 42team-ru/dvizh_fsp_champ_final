import { Link, Navigate, useNavigate, useParams } from "react-router";
import { useUser } from "@/entity/user/model/use-user";
import { usePetsGetUser } from "@/shared/api/generated/core/pets/pets";
import { useUsersGet } from "@/shared/api/generated/core/users/users";
import type { PetResponse, PublicUserResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { UserAlbum } from "@/widgets/album/ui/album";
import { BeaverPet } from "@/widgets/beaver-pet/ui/beaver-pet";
import type { BeaverActivity, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { SPORT_LEVEL_LABEL } from "@/shared/lib/statuses";
import { PassportSpread } from "@/pages/profile/ui/passport-spread";

const fullName = (u: PublicUserResponse) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username;

/** Маскот человека: его образ, настроение всегда спокойное; гардероба и реплик нет. */
function PetCard({ pet, className }: { pet: PetResponse | undefined; className?: string }) {
  return (
    <Card className={`flex-row items-center gap-4 overflow-hidden rounded-[28px] bg-sky-soft p-4 ${className ?? ""}`}>
      <div className="w-[220px] shrink-0 rounded-3xl border-2 border-ink bg-sky">
        <BeaverPet mood="idle" followCursor={false} outfit={(pet?.outfit ?? {}) as BeaverOutfit}
          activity={(pet?.activity ?? "none") as BeaverActivity} />
      </div>
      <div className="min-w-0">
        <Eyebrow>ПИТОМЕЦ</Eyebrow>
        <p className="mt-1 font-display text-2xl font-bold">{pet?.name ?? "Бублик"}</p>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Бобр-спутник. Наряд выбирает хозяин.</p>
      </div>
    </Card>
  );
}

/** Публичный профиль: паспорт, маскот и альбом — только смотреть. Свой id ведёт в «Мой профиль». */
export default function UserProfilePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user: me } = useUser();
  const query = useUsersGet(id);
  const pet = usePetsGetUser(id);
  const person = query.data?.status === 200 ? query.data.data : undefined;
  const petData = pet.data?.status === 200 ? pet.data.data : undefined;

  if (me?.id && me.id === id) return <Navigate to="/profile" replace />;

  const status = query.isPending ? "Загружаем профиль…" : query.isError ? (query.error?.detail ?? "Пользователь не найден") : null;

  return (
    <>
      {/* Телефон: паспорт в развороте не помещается — короткая карточка с теми же данными. */}
      <div className="relative isolate flex min-h-dvh flex-col gap-4 overflow-clip bg-background px-4 pt-4 pb-[110px] lg:hidden">
        <MemphisBackground variant="mobile" seed="profile" />
        <Button variant="soft" className="w-fit" onClick={() => navigate(-1)}>← Назад</Button>
        {status && <p role={query.isError ? "alert" : undefined} className="text-base font-semibold text-muted-foreground">{status}</p>}
        {person && (
          <>
            <Card className="gap-3 rounded-[26px] p-4">
              <div className="flex items-center gap-3">
                <UserAvatar user={person} className="size-[72px] shrink-0 rounded-full border-2 border-ink object-cover" />
                <div className="min-w-0">
                  <Eyebrow>ПАСПОРТ СПОРТСМЕНА</Eyebrow>
                  <h1 className="truncate font-display text-xl font-bold">{fullName(person)}</h1>
                  <p className="truncate text-[13px] font-medium text-muted-foreground">
                    @{person.username}{person.city ? ` · ${person.city}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {person.sports.map((s) => (
                  <Badge key={s.sport.id} className="bg-lime-soft text-foreground">
                    {s.sport.name}{s.level ? ` · ${SPORT_LEVEL_LABEL[s.level] ?? ""}` : ""}
                  </Badge>
                ))}
              </div>
              {person.bio && <p className="text-sm font-medium">{person.bio}</p>}
              <p className="text-sm font-bold">Посещено встреч: {person.attendedCount}</p>
            </Card>
            <PetCard pet={petData} />
            <UserAlbum userId={person.id} editable={false} />
          </>
        )}
        <MobileTabBar current="profile" />
      </div>

      <div className="relative isolate hidden min-h-dvh overflow-clip bg-background lg:block">
        <MemphisBackground seed="profile" />
        <AppHeader current="profile" />
        <main className="mx-auto w-full max-w-[1280px] px-8 pt-8 pb-12">
          {status && <p role={query.isError ? "alert" : undefined} className="text-lg font-semibold text-muted-foreground">{status}</p>}
          {person && (
            <>
              <div className="relative h-[600px] w-[1216px]">
                <PassportSpread person={person} />
              </div>
              <div className="mt-6 grid grid-cols-[1fr_1fr] gap-6">
                <PetCard pet={petData} />
                <Card className="gap-3 rounded-[28px] p-6">
                  <h2 className="font-display text-[22px] font-bold">Организует</h2>
                  {person.events.length === 0 && <p className="text-sm font-semibold text-muted-foreground">Ближайших встреч нет.</p>}
                  <ul className="flex flex-col gap-2">
                    {person.events.slice(0, 5).map((e) => (
                      <li key={e.id}>
                        <Link to={`/events/${e.id}`} className="block rounded-2xl border-2 border-ink px-4 py-2 hover:bg-muted">
                          <span className="block truncate font-bold">{e.title}</span>
                          <span className="block text-xs font-semibold text-muted-foreground">
                            {e.sport.name} · {new Date(e.startAt).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
              <UserAlbum userId={person.id} editable={false} className="mt-6" />
            </>
          )}
        </main>
      </div>
    </>
  );
}
