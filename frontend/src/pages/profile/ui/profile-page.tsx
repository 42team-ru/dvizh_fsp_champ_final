import { useAttendance } from "./use-attendance";
import { PassportSpread, SPREAD_H } from "./passport-spread";
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
    <Card style={{ top: SPREAD_H + 20 }} className="absolute left-[515px] h-[316px] w-[701px] justify-between overflow-hidden rounded-[28px] bg-primary px-[28px] py-[26px]">
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
        <div className="relative w-[1216px]" style={{ height: SPREAD_H + 20 + 316 }}>
          <PassportSpread />
          <HistoryCard />
          <Attendance />
        </div>
        <AchievementsColumn wide className="mt-6 w-[1216px]" />
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
