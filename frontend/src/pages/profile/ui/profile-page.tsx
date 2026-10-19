import { PetNameEditor } from "@/features/rename-pet/ui/pet-name-editor";
import { useState } from "react";
import { useAttendance } from "./use-attendance";
import { PassportSpread } from "./passport-spread";
import { HistoryCard } from "./history-card";
import { MyBeaverPet } from "@/widgets/beaver-pet/ui/my-beaver-pet";
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

const WARDROBE = [
  { name: "Кепка", art: "memphis3", left: 0, state: "worn", tone: "bg-peach" },
  { name: "Шарф", art: "memphis4", left: 132, state: "owned", tone: "bg-card" },
  { name: "Кроссовки", art: "memphis5", left: 264.5, price: 90, tone: "bg-card" },
  { name: "Очки", art: "memphis6", left: 396.5, price: 50, tone: "bg-card" },
  { name: "Худи", art: "memphis7", left: 529, price: 120, tone: "bg-card" },
] as const;

const BADGES = [
  { title: "Первые 100 км", icon: "icon-trophy", tone: "bg-secondary", left: 0, top: 0 },
  { title: "Серия 7 дней", icon: "icon-flame", tone: "bg-peach", left: 254, top: 0 },
  { title: "Ранняя пташка", icon: "icon-sun", tone: "bg-lavender-soft", left: 508, top: 0 },
  { title: "Организатор", icon: "icon-star", tone: "bg-sky-soft", left: 0, top: 74 },
];

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
          <PetNameEditor>
            <div className="flex items-center justify-end gap-2">
              <Badge variant="secondary" className="h-[38px] gap-[6px] border-2 px-[14px] text-[15px] font-extrabold">
                <Icon name="profile/icon-coin" className="size-[18px]" />
                150
              </Badge>
            </div>
          </PetNameEditor>
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
  return (
    <Card className="absolute top-[1266px] left-[412px] h-[235px] w-[804px] overflow-hidden">
      <h2 className="absolute top-6 left-6 font-display text-[22px] leading-[27px] font-bold text-foreground">
        Достижения
      </h2>
      <span className="absolute top-8 left-[726.5px] text-[13px] leading-[18px] font-bold whitespace-nowrap text-muted-foreground">
        12 из 30
      </span>
      <div className="absolute top-[69px] left-6 h-[138px] w-[752px]">
        {BADGES.map((b) => (
          <BadgeTile
            key={b.title}
            title={b.title}
            icon={b.icon}
            tone={b.tone}
            style={{ left: b.left, top: b.top }}
          />
        ))}
        <BadgeTile
          title="Марафон · пробеги 42 км за раз"
          icon="icon-lock"
          locked
          className="top-[74px] left-[254px]"
        />
      </div>
    </Card>
  );
}

function Wardrobe() {
  return (
    <Card className="absolute top-[970px] left-[515px] h-[276px] w-[701px] overflow-hidden">
      <h2 className="absolute top-6 left-6 font-display text-[22px] leading-[27px] font-bold text-foreground">
        Гардероб
      </h2>
      <span className="absolute top-8 left-[453px] text-[13px] leading-[18px] font-semibold whitespace-nowrap text-muted-foreground">
        Монеты — за тренировки и бейджи
      </span>
      <div className="absolute top-[69px] left-6 h-[179px] w-[649px]">
        {WARDROBE.map((w) => (
          <div
            key={w.name}
            className={cn(
              "absolute top-0 h-[179px] w-[120px] rounded-[18px] border-2 border-ink",
              w.tone
            )}
            style={{ left: w.left }}
          >
            <Img name={`${w.art}.svg`} className="top-[14px] left-[32px] size-[52px]" />
            <p className="absolute inset-x-0 top-[72px] text-center text-sm leading-[19px] font-extrabold text-foreground">
              {w.name}
            </p>
            {"price" in w ? (
              <p className="absolute inset-x-0 top-[97px] flex items-center justify-center gap-1 text-[13px] leading-[18px] font-extrabold text-foreground">
                <Icon name="profile/icon-coin1" className="size-[15px]" />
                {w.price}
              </p>
            ) : (
              <p className="absolute inset-x-0 top-[97px] text-center text-xs leading-[17px] font-bold text-muted-foreground">
                {w.state === "worn" ? "Надета" : "Куплено"}
              </p>
            )}
            <div className="absolute inset-x-0 top-[124px] flex justify-center">
              {"state" in w && w.state === "worn" ? (
                <Button variant="ink" className="h-9 px-4 text-[13px] leading-[18px]">
                  Снять
                </Button>
              ) : (
                <Button variant="soft" className="h-9 px-4 text-[13px] leading-[18px]">
                  {"price" in w ? "Купить" : "Надеть"}
                </Button>
              )}
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
      </main>
    </div>
    </>
  );
}
