import { WardrobeDialog } from "@/features/pet-wardrobe/ui/wardrobe-dialog";
import { BrandPlate } from "@/shared/components/ui/brand-plate";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { useState } from "react";
import { useAttendance } from "./use-attendance";
import { useProfile } from "../model/use-profile";
import { useWardrobe } from "../model/use-wardrobe";
import { usePublicProfile } from "../model/public-profile";
import { ProfileBeaverPet, ProfilePetName } from "./profile-pet";
import { EditProfileDialog } from "@/features/edit-profile/ui/edit-profile-dialog";
import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthLogout } from "@/shared/api/generated/core/auth/auth";
import { USER_QUERY_KEY } from "@/entity/user/model/use-user";
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
        <EditProfileDialog user={user}>
          <button
            type="button"
            aria-label="Редактировать профиль"
            className="box-border flex size-11 items-center justify-center rounded-[22px] border-2 border-ink bg-card"
          >
            <Icon name={`${dir}/icon-settings`} className="size-5" />
          </button>
        </EditProfileDialog>
      )}
    </div>
  );
}

function Passport() {
  const p = useProfile();
  return (
    <div className="px-4">
      <div className="box-border w-full overflow-hidden rounded-[26px] border-2 border-ink bg-card shadow-[4px_4px_0_var(--primary)]">
        <div className="flex h-10 items-center justify-between bg-secondary px-[18px] text-[10px] leading-[normal] font-extrabold tracking-[1px] whitespace-nowrap text-foreground">
          <span>ЦИФРОВОЙ ПАСПОРТ · Движ</span>
          <span>{p.passportNumber}</span>
        </div>
        <div className="flex flex-col gap-[14px] p-[18px]">
          <div className="flex items-center gap-[14px]">
            <UserAvatar
              user={p.user}
              className="box-border size-[72px] shrink-0 rounded-[36px] border-2 border-ink object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <Eyebrow className={small}>ИМЯ</Eyebrow>
              <p className="w-[190px] font-display text-[19px] leading-6 font-bold text-foreground">
                {p.fullName}
              </p>
              <p className="text-[13px] leading-[normal] font-medium whitespace-nowrap text-muted-foreground">
                {p.handle}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {p.sports.slice(0, 3).map((s, i) => (
              <span
                key={s.sport.id}
                className={cn(
                  "rounded-pill border-[1.5px] border-ink px-[14px] py-[6px] text-[13px] leading-[normal] font-extrabold whitespace-nowrap text-foreground",
                  SPORT_TONES[i],
                )}
              >
                {s.sport.name}
              </span>
            ))}
          </div>
          <div className="flex gap-2 leading-[normal] font-bold whitespace-nowrap">
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
                <span className="text-[11px] text-muted-foreground">
                  {s.label}
                </span>
                <RoughBorder radius={14} strokeWidth={1.5} roughness={0.8} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Pet() {
  const owner = usePublicProfile();
  const [speechContainer, setSpeechContainer] = useState<HTMLDivElement | null>(
    null,
  );
  return (
    <div className="px-4">
      <div className="box-border flex w-full flex-col gap-3 rounded-[26px] border-2 border-ink bg-sky p-[18px] shadow-[4px_4px_0_var(--ink)]">
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
        <div ref={setSpeechContainer} className="relative h-[72.5px] w-full" />
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
              <WardrobeDialog>
                <Button variant="soft" className="h-10 w-full px-5 text-xs">
                  Сменить
                </Button>
              </WardrobeDialog>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthLogout();
  const signOut = async () => {
    await logout.mutateAsync().catch(() => undefined);
    queryClient.removeQueries({ queryKey: USER_QUERY_KEY });
    navigate("/auth/login");
  };
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
      <ProfileGallery owner={{ ...user, id: user.id }} mine={!readOnly} aboutPhotos={photos} />
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
      {!owner && <AchievementsStrip />}
      <Wardrobe />
      {!owner && <Settings />}
      <MobileTabBar current={owner ? "feed" : "profile"} />
    </div>
  );
}
