import { BrandPlate } from "@/shared/components/ui/brand-plate";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { useState } from "react";
import { useAttendance } from "./use-attendance";
import { useProfile } from "../model/use-profile";
import { useWardrobe } from "../model/use-wardrobe";
import { usePublicProfile } from "../model/public-profile";
import { ProfileBeaverPet, ProfilePetName } from "./profile-pet";
import { EditProfileDialog } from "@/features/edit-profile/ui/edit-profile-dialog";
import { Link } from "react-router";
import { BriefcaseBusiness } from "lucide-react";
import { useSignOut } from "@/features/auth/sign-out/model/use-sign-out";
import { useCabinetAccess } from "@/entity/user/model/use-cabinet-access";
import { ProfileGallery } from "@/widgets/profile-gallery/ui/profile-gallery";
import { AchievementsStrip } from "./achievements";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Icon } from "@/shared/components/ui/icon";
import { RoughBorder } from "@/shared/components/ui/rough-border";
import { cn } from "cn";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { ProfileShare } from "./profile-share";
import { PassportWaves } from "@/features/share-link/ui/share-posters";
import {
  PassportHologram,
  PassportMrz,
  PassportPageHeader,
} from "./passport-decoration";

const dir = "m-profile";

const SPORT_TONES = ["bg-sky-soft", "bg-lime-soft", "bg-peach"];
const STAT_TONES = ["bg-lavender-soft", "bg-lime-soft", "bg-peach"];
const WARDROBE_TONES = [
  "bg-peach",
  "bg-lime-soft",
  "bg-sky-soft",
  "bg-lavender-soft",
  "bg-rose",
];

const SETTINGS = [
  { icon: "icon-bell-set", label: "Уведомления" },
  { icon: "icon-shield", label: "Приватность" },
  { icon: "icon-settings1", label: "Настройки приложения" },
  { icon: "icon-logout", label: "Выйти", danger: true },
];

const small =
  "text-[10px] leading-[normal] font-extrabold tracking-[1.2px] whitespace-nowrap";

function AppBar() {
  const { user, readOnly } = useProfile();
  const cabinet = useCabinetAccess();
  return (
    <div className="flex h-16 shrink-0 items-center justify-between px-4">
      <BrandPlate>
        <img src="/icon.svg" alt="" className="size-9 shrink-0" />
        <span className="font-display text-xl leading-[normal] font-bold text-foreground">
          Профиль
        </span>
      </BrandPlate>
      {readOnly ? (
        <Link
          to="/feed"
          aria-label="Назад к ленте"
          className="box-border flex size-11 items-center justify-center rounded-[22px] border-2 border-ink bg-card"
        >
          <Icon name={`${dir}/icon-chev`} className="size-5 rotate-180" />
        </Link>
      ) : (
        <div className="flex gap-2">
          {cabinet.allowed && (
            <Link
              to="/my/events"
              aria-label="Кабинет организатора"
              className="box-border flex size-11 items-center justify-center rounded-[22px] border-2 border-ink bg-card"
            >
              <BriefcaseBusiness className="size-5" strokeWidth={2.2} />
            </Link>
          )}
          <EditProfileDialog user={user}>
            <button
              type="button"
              aria-label="Редактировать профиль"
              className="box-border flex size-11 items-center justify-center rounded-[22px] border-2 border-ink bg-card"
            >
              <Icon name={`${dir}/icon-settings`} className="size-5" />
            </button>
          </EditProfileDialog>
        </div>
      )}
    </div>
  );
}

function Passport() {
  const p = useProfile();
  return (
    <div className="px-4">
      <div className="relative box-border w-full overflow-hidden rounded-[26px] border-2 border-ink bg-ultramarine p-2 shadow-hard-sm">
        <div className="relative overflow-hidden rounded-[17px] border-2 border-ink bg-card">
          <PassportWaves className="pointer-events-none absolute inset-0 text-primary/10" />
          <PassportPageHeader
            title="◉ ПАСПОРТ СПОРТСМЕНА"
            page={1}
            className="px-3 [&_h2]:text-[10px] [&_h2]:tracking-[0.8px]"
          />
          <div className="relative flex flex-col gap-4 p-4">
            <div className="flex items-center gap-[14px]">
              <div className="relative shrink-0">
                <UserAvatar
                  user={p.user}
                  className="box-border h-24 w-20 rounded-xl border-2 border-ink object-cover"
                />
                <PassportHologram />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <Eyebrow className={small}>ИМЯ</Eyebrow>
                <p className="break-words font-display text-[19px] leading-6 font-bold text-foreground">
                  {p.fullName}
                </p>
                <p className="break-words text-sm leading-snug font-medium text-muted-foreground">
                  {p.handle}
                </p>
                <p className="text-xs font-bold text-muted-foreground">
                  {p.passportNumber}
                </p>
              </div>
            </div>
            <ProfileShare user={p.user} className="w-fit self-end" />
            <div className="flex flex-wrap gap-2">
              {p.sports.slice(0, 3).map((s, i) => (
                <span
                  key={s.sport.id}
                  className={cn(
                    "max-w-full truncate rounded-pill border-[1.5px] border-ink px-3 py-[6px] text-sm leading-[normal] font-extrabold text-foreground",
                    SPORT_TONES[i],
                  )}
                >
                  {s.sport.name}
                </span>
              ))}
            </div>
            <div className="flex gap-2 leading-[normal] font-bold">
              {p.stats.map((s, i) => (
                <div
                  key={s.label}
                  className={cn(
                    "relative box-border flex min-w-0 flex-1 flex-col gap-[2px] rounded-[14px] border-[1.5px] border-transparent p-[10px]",
                    STAT_TONES[i],
                  )}
                >
                  <span className="font-display text-lg text-foreground">
                    {s.value}
                  </span>
                    <span className="text-xs leading-4 text-muted-foreground">
                    {s.label}
                  </span>
                  <RoughBorder radius={14} strokeWidth={1.5} roughness={0.8} />
                </div>
              ))}
            </div>
            <PassportMrz
              user={p.user}
              className="text-[clamp(8px,2.55vw,11px)] tracking-normal"
            />
          </div>
        </div>
        <div
          aria-hidden="true"
          className="mx-3 mt-2 border-b-2 border-dashed border-lime"
        />
      </div>
    </div>
  );
}

function Pet() {
  const owner = usePublicProfile();
  const { worn } = useWardrobe();
  const [speechContainer, setSpeechContainer] = useState<HTMLDivElement | null>(
    null,
  );
  return (
    <div className="px-4">
      <div className="box-border w-full overflow-hidden rounded-[26px] border-2 border-ink bg-ultramarine p-2 shadow-hard-sm">
        <div className="overflow-hidden rounded-[17px] border-2 border-ink bg-sky">
          <PassportPageHeader title="СОПРОВОЖДАЮЩИЙ" page={2} />
          <div className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <ProfileBeaverPet
                speechContainer={speechContainer}
                className="size-28 shrink-0 [&_.beaver-pet]:h-full [&_svg]:h-full"
              />
              <div className="flex min-w-[180px] flex-1 flex-col items-start gap-1">
                <Eyebrow className={cn(small, "text-foreground")}>
                  {owner ? "ПИТОМЕЦ" : "ТВОЙ ПИТОМЕЦ"}
                </Eyebrow>
                <ProfilePetName />
              </div>
            </div>
            <div
              ref={setSpeechContainer}
              className="relative min-h-[92px] w-full"
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-5">
              <p className="min-w-0 flex-1 font-semibold">
                Образ:{" "}
                {worn.length
                  ? worn.map((item) => item.item).join(" + ")
                  : "без образа"}
              </p>
              {!owner && (
                <Link
                  to="/profile/wardrobe"
                  className="py-2 font-extrabold text-primary underline underline-offset-4"
                >
                  Изменить образ
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Attendance() {
  const { total, text, word } = useAttendance();
  return (
    <div className="px-4">
      <div className="box-border flex w-full flex-col gap-2 rounded-[24px] border-2 border-ink bg-primary p-5">
        <Eyebrow className={cn(small, "tracking-[1.5px] text-lilac")}>
          ПОСЕЩЕНО
        </Eyebrow>
        <div className="flex items-end gap-2 leading-[normal] whitespace-nowrap text-white">
          <span className="font-display text-[52px] font-extrabold">
            {total}
          </span>
          <span className="font-display text-xl font-bold">{word}</span>
        </div>
        <p className="text-[13px] leading-[18px] font-bold text-white">
          {text}
        </p>
      </div>
    </div>
  );
}

function Head({
  title,
  hint,
  small: hintSmall,
}: {
  title: string;
  hint: string;
  small?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 leading-[normal] font-bold whitespace-nowrap">
      <h2 className="font-display text-lg text-foreground">{title}</h2>
      <span
        className={cn(
          "text-muted-foreground",
          hintSmall ? "text-xs" : "text-[13px]",
        )}
      >
        {hint}
      </span>
    </div>
  );
}

function Wardrobe() {
  const owner = usePublicProfile();
  const { worn } = useWardrobe();
  const cards =
    worn.length > 0
      ? worn
      : [{ slot: "Пока ничего не надето", item: "Гардероб" }];
  return (
    <>
      <Head title="Гардероб" hint="Что надето на бобре" small />
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4">
        {cards.map((w, i) => (
          <div
            key={w.slot}
            className={cn(
              "box-border flex w-[132px] shrink-0 flex-col items-center gap-[6px] rounded-[20px] border-2 border-ink px-3 py-[14px]",
              WARDROBE_TONES[i % WARDROBE_TONES.length],
            )}
          >
            <span className="box-border size-14 rounded-[28px] border-2 border-ink bg-card" />
            <span
              className="line-clamp-1 text-center text-sm leading-[normal] font-extrabold text-foreground"
              title={w.item}
            >
              {w.item}
            </span>
            <span className="line-clamp-1 text-center text-xs leading-[normal] font-bold text-muted-foreground">
              {w.slot}
            </span>
            {!owner && (
              <Button
                asChild
                variant="soft"
                className="min-h-11 w-full px-5 text-xs"
              >
                <Link to="/profile/wardrobe">Сменить</Link>
              </Button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function Settings() {
  const { signOut } = useSignOut();
  return (
    <div className="px-4">
      <Card className="overflow-hidden rounded-[22px]">
        {SETTINGS.map((s, i) => (
          <div key={s.label}>
            {i > 0 ? <div className="h-px bg-track" /> : null}
            <button
              type="button"
              onClick={"danger" in s ? () => void signOut() : undefined}
              className="flex h-14 w-full items-center gap-3 px-[18px] text-left"
            >
              <Icon name={`${dir}/${s.icon}`} className="size-[22px]" />
              <span
                className={cn(
                  "text-[15px] leading-[normal] font-extrabold whitespace-nowrap",
                  "danger" in s ? "text-accent" : "text-foreground",
                )}
              >
                {s.label}
              </span>
              <Icon name={`${dir}/icon-chev`} className="ml-auto size-[18px]" />
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Gallery() {
  const { user, readOnly } = useProfile();
  if (!user?.id) return null;
  const photos = readOnly && "photos" in user ? user.photos : undefined;
  return (
    <div className="px-4">
      <ProfileGallery
        owner={{ ...user, id: user.id }}
        mine={!readOnly}
        aboutPhotos={photos}
      />
    </div>
  );
}

export function ProfileMobile() {
  const owner = usePublicProfile();
  return (
    <div className="relative isolate flex min-h-dvh overflow-clip flex-col gap-4 bg-background pb-[110px] lg:hidden">
      <MemphisBackground variant="mobile" seed={owner ? "user" : "profile"} />
      <AppBar />
      <Passport />
      <Gallery />
      <Pet />
      <Attendance />
      <AchievementsStrip />
      <Wardrobe />
      {!owner && <Settings />}
      <MobileTabBar current={owner ? "feed" : "profile"} />
    </div>
  );
}
