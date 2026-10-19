import { useAttendance } from "./use-attendance";
import { PassportSpread, SPREAD_H } from "./passport-spread";
import { HistoryCard } from "./history-card";
import { useProfile } from "../model/use-profile";
import { ProfileGallery } from "./profile-gallery";
import { ProfileMobile } from "./profile-mobile";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Icon } from "@/shared/components/ui/icon";
import { RoughBorder } from "@/shared/components/ui/rough-border";
import { cn } from "cn";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";


function Img({ name, className }: { name: string; className?: string }) {
  return <img src={`/profile/${name}`} alt="" className={cn("absolute max-w-none", className)} />;
}

function Attendance() {
  const { total, text, word } = useAttendance();
  return (
    <Card className="absolute top-[573px] left-[515px] h-[626px] w-[701px] justify-between overflow-hidden rounded-[28px] bg-primary px-[28px] py-[26px]">
      <Img name="memphis2.svg" className="top-0 right-0 h-[260px] w-[400px]" />
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

function Achievements() {
  const { achievements } = useProfile();
  const unlocked = achievements.filter((a) => a.unlocked);
  const next = achievements.find((a) => !a.unlocked);
  return (
    <Card
      className="absolute top-0 left-[944px] w-[272px] gap-4 overflow-hidden p-5"
      style={{ height: SPREAD_H }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-[22px] leading-[27px] font-bold text-foreground">
          Достижения
        </h2>
        <span className="text-[13px] leading-[18px] font-bold whitespace-nowrap text-muted-foreground">
          {unlocked.length} из {achievements.length}
        </span>
      </div>
      <ul className="flex min-h-0 flex-col gap-[10px] overflow-y-auto">
        {unlocked.map((b) => (
          <li
            key={b.title}
            className="flex items-center gap-[10px] rounded-2xl border-2 border-ink p-3"
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink",
                b.tone
              )}
            >
              <Icon name={`profile/${b.icon}`} className="size-5" />
            </span>
            <span className="text-[13px] leading-[18px] font-extrabold text-foreground">
              {b.title}
            </span>
          </li>
        ))}
        {next && (
          <li className="flex items-center gap-[10px] rounded-2xl border-2 border-dashed border-ink p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-ink">
              <Icon name="profile/icon-lock" className="size-[18px]" />
            </span>
            <span className="text-[13px] leading-[18px] font-extrabold text-muted-foreground">
              Следующее · {next.title}
            </span>
          </li>
        )}
      </ul>
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
        <div className="relative h-[1199px] w-[1216px]">
          <PassportSpread />
          <HistoryCard />
          <Attendance />
          <Achievements />
        </div>
        <div className="mt-6"><ProfileGallery /></div>
      </main>
    </div>
    </>
  );
}
