import { PetNameEditor } from "@/features/rename-pet/ui/pet-name-editor";
import { useState } from "react";
import { useAttendance } from "./use-attendance";
import { PassportSpread } from "./passport-spread";
import { HistoryCard } from "./history-card";
import { useProfile } from "../model/use-profile";
import { useWardrobe } from "../model/use-wardrobe";
import { Link } from "react-router";
import { MyBeaverPet } from "@/widgets/beaver-pet/ui/my-beaver-pet";
import { ProfileGallery } from "./profile-gallery";
import { ProfileMobile } from "./profile-mobile";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Icon } from "@/shared/components/ui/icon";
import { RoughBorder } from "@/shared/components/ui/rough-border";
import { cn } from "cn";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";

const WARDROBE_ART = ["memphis3", "memphis4", "memphis5", "memphis6", "memphis7"];
const WARDROBE_LEFT = [0, 132, 264.5, 396.5, 529];
const BADGE_POS = [{ left: 0, top: 0 }, { left: 254, top: 0 }, { left: 508, top: 0 }, { left: 0, top: 74 }];

function Img({ name, className }: { name: string; className?: string }) {
  return <img src={`/profile/${name}`} alt="" className={cn("absolute max-w-none", className)} />;
}

function Pet() {
  const [speechContainer, setSpeechContainer] = useState<HTMLDivElement | null>(null);
  return (
    <Card className="absolute top-[620px] left-[515px] h-[330px] w-[701px] flex-row items-start overflow-hidden rounded-[28px] bg-sky-soft p-0">
      <div className="relative h-[326px] w-[330px] shrink-0 overflow-hidden border-r-2 border-ink bg-sky">
        <Img name="memphis1.svg" className="top-0 left-0 size-[330px]" />
        <MyBeaverPet speechContainer={speechContainer} className="absolute top-[18px] left-[12px] h-[300px] w-[300px] [&_.beaver-pet]:h-full [&_svg]:h-full" />
        {/* Реплика бобра — облачко справа сверху от него, хвостиком к голове. */}
        <div ref={setSpeechContainer} className="beaver-speech-corner absolute top-3 right-3 z-10 w-[170px]" />
      </div>
      <div className="flex h-[326px] w-[367px] shrink-0 flex-col items-start gap-2 px-[28px] py-4">
        <div className="w-full min-w-0 shrink-0">
          <Eyebrow>ТВОЙ ПИТОМЕЦ</Eyebrow>
          <PetNameEditor />
        </div>

      </div>
    </Card>
  );
}

function Attendance() {
  const { total, text, word } = useAttendance();
  return (
    <Card className="absolute top-[1266px] left-0 h-[235px] w-[392px] justify-between overflow-hidden rounded-[28px] bg-primary px-[28px] py-[26px]">
      <Img name="memphis2.svg" className="top-0 left-0 h-[260px] w-[400px]" />
      <div className="relative h-[81px] w-[336px]">
        <Eyebrow className="text-lilac">ПОСЕЩЕНО</Eyebrow>
        <p className="absolute top-[18px] left-0 w-[167px] font-display font-extrabold whitespace-nowrap text-white">
          <span className="text-[56px] leading-[56px]">{total} </span>
          <span className="text-[22px] leading-[56px]">{word}</span>
        </p>
      </div>
      <p className="relative w-[213.5px] text-sm leading-[19.5px] font-semibold text-white">
        {text}
      </p>
    </Card>
  );
}

function BadgeTile({
  title,
  icon,
  tone,
  locked,
  className,
  style,
}: {
  title: string;
  icon: string;
  tone?: string;
  locked?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "absolute flex h-16 items-center gap-[10px] rounded-2xl border-2 p-3",
        locked ? "w-[498px] border-dashed border-ink" : "w-[244px] border-ink",
        className
      )}
      style={style}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink",
          locked && "border-dashed",
          tone
        )}
      >
        <Icon name={`profile/${icon}`} className={locked ? "size-[18px]" : "size-5"} />
      </span>
      <span
        className={cn(
          "text-[13px] leading-[18px] font-extrabold whitespace-nowrap",
          locked ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {title}
      </span>
    </div>
  );
}

function Achievements() {
  const { achievements } = useProfile();
  const unlocked = achievements.filter((a) => a.unlocked);
  const next = achievements.find((a) => !a.unlocked);
  return (
    <Card className="absolute top-[1266px] left-[412px] h-[235px] w-[804px] overflow-hidden">
      <h2 className="absolute top-6 left-6 font-display text-[22px] leading-[27px] font-bold text-foreground">
        Достижения
      </h2>
      <span className="absolute top-8 left-[726.5px] text-[13px] leading-[18px] font-bold whitespace-nowrap text-muted-foreground">
        {unlocked.length} из {achievements.length}
      </span>
      <div className="absolute top-[69px] left-6 h-[138px] w-[752px]">
        {unlocked.slice(0, 4).map((b, i) => (
          <BadgeTile
            key={b.title}
            title={b.title}
            icon={b.icon}
            tone={b.tone}
            style={BADGE_POS[i]}
          />
        ))}
        {next && (
          <BadgeTile
            title={`Следующее · ${next.title}`}
            icon="icon-lock"
            locked
            className="top-[74px] left-[254px]"
          />
        )}
      </div>
    </Card>
  );
}

function Wardrobe() {
  const { worn } = useWardrobe();
  const cards = worn.length > 0 ? worn.slice(0, 5) : [{ slot: "Пока ничего не надето", item: "Гардероб" }];
  return (
    <Card className="absolute top-[970px] left-[515px] h-[276px] w-[701px] overflow-hidden">
      <h2 className="absolute top-6 left-6 font-display text-[22px] leading-[27px] font-bold text-foreground">
        Гардероб
      </h2>
      <span className="absolute top-8 left-[453px] text-[13px] leading-[18px] font-semibold whitespace-nowrap text-muted-foreground">
        Что сейчас надето на бобре
      </span>
      <div className="absolute top-[69px] left-6 h-[179px] w-[649px]">
        {cards.map((w, i) => (
          <div
            key={w.slot}
            className={cn(
              "absolute top-0 h-[179px] w-[120px] rounded-[18px] border-2 border-ink",
              i === 0 ? "bg-peach" : "bg-card"
            )}
            style={{ left: WARDROBE_LEFT[i] }}
          >
            <Img name={`${WARDROBE_ART[i]}.svg`} className="top-[14px] left-[32px] size-[52px]" />
            <p className="absolute inset-x-1 top-[72px] line-clamp-1 text-center text-sm leading-[19px] font-extrabold text-foreground" title={w.item}>
              {w.item}
            </p>
            <p className="absolute inset-x-1 top-[97px] line-clamp-1 text-center text-xs leading-[17px] font-bold text-muted-foreground">
              {w.slot}
            </p>
            <div className="absolute inset-x-0 top-[124px] flex justify-center">
              <Button asChild variant="soft" className="h-9 px-4 text-[13px] leading-[18px]">
                <Link to="/pet">Сменить</Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <>
    <ProfileMobile />
    <div className="relative isolate hidden min-h-dvh overflow-clip bg-background lg:block">
      <MemphisBackground seed="profile" />
      <AppHeader current="profile" />
      <main className="mx-auto w-full max-w-[1280px] px-8 pt-8 pb-12">
        <div className="relative h-[1501px] w-[1216px]">
          <PassportSpread />
          <HistoryCard />
          <Pet />
          <Wardrobe />
          <Attendance />
          <Achievements />
        </div>
        <div className="mt-6"><ProfileGallery /></div>
      </main>
    </div>
    </>
  );
}
