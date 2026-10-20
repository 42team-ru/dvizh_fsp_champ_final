import { useAttendance } from "./use-attendance";
import { PassportSpread } from "./passport-spread";
import { HistoryCard } from "./history-card";
import { AchievementsColumn } from "./achievements";
import { ProfileMobile } from "./profile-mobile";
import { useUser } from "@/entity/user/model/use-user";
import { usePublicProfile } from "../model/public-profile";
import { ProfileGallery } from "@/widgets/profile-gallery/ui/profile-gallery";
import { ProfileBlog } from "@/widgets/profile-blog/ui/profile-blog";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { RoughBorder } from "@/shared/components/ui/rough-border";
import { cn } from "cn";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";


function Img({ name, className }: { name: string; className?: string }) {
  return <img src={`/profile/${name}`} alt="" className={cn("absolute max-w-none", className)} />;
}

function Attendance() {
  const { total, text, word } = useAttendance();
  return (
    <Card className="relative shrink-0 gap-2 overflow-hidden rounded-[24px] bg-primary p-5">
      <Img name="memphis2.svg" className="top-0 right-0 h-[140px] w-[216px] opacity-90" />
      <Eyebrow className="relative text-lilac">ПОСЕЩЕНО</Eyebrow>
      <p className="relative font-display font-extrabold whitespace-nowrap text-white">
        <span className="text-[52px] leading-[56px]">{total} </span>
        <span className="text-[18px] leading-[56px]">{word}</span>
      </p>
      <p className="relative text-[13px] leading-[19px] font-semibold text-white">{text}</p>
    </Card>
  );
}

/** Свой профиль, а внутри `PublicProfileProvider` — чужой: те же блоки, только для просмотра. */
export default function ProfilePage() {
  const owner = usePublicProfile();
  const { user: me } = useUser();
  const user = owner ? owner.user : me;
  return (
    <>
    <ProfileMobile />
    <div className="relative isolate hidden min-h-dvh overflow-clip bg-background lg:block">
      <MemphisBackground seed={owner ? "user" : "profile"} />
      <AppHeader current={owner ? "feed" : "profile"} />
      <main className="mx-auto w-full max-w-[1280px] px-8 pt-8 pb-12">
        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <PassportSpread />
          <div className="grid min-w-0 grid-cols-2 items-start gap-4 xl:flex xl:flex-col xl:items-stretch">
            <Attendance />
            <HistoryCard />
          </div>
        </div>
        <AchievementsColumn wide className="mt-6 w-full" />
        {user?.id && (
          <ProfileGallery
            className="mt-12"
            owner={{ ...user, id: user.id }}
            mine={!owner}
            aboutPhotos={owner?.user.photos}
          />
        )}
        {user?.id && <ProfileBlog className="mt-12" userId={user.id} mine={!owner} />}
      </main>
    </div>
    </>
  );
}
