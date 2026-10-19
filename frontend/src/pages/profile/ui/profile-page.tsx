import { PetNameEditor } from "@/features/rename-pet/ui/pet-name-editor";
import { useState } from "react";
import { useAttendance } from "./use-attendance";
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

const STATS = [
  { value: "48", label: "тренировок", tone: "bg-card" },
  { value: "312", label: "километров", tone: "bg-card" },
  { value: "12", label: "дней подряд", tone: "bg-secondary" },
];

/** Километры по дням октября; `accent` — лучшие дни, `0` — пустые. */
const BARS: { h: number; accent?: boolean }[] = [
  { h: 25 }, { h: 2 }, { h: 34.5 }, { h: 39 }, { h: 2 }, { h: 56.5, accent: true }, { h: 19 },
  { h: 2 }, { h: 30 }, { h: 33 }, { h: 2 }, { h: 63, accent: true }, { h: 22 }, { h: 2 },
  { h: 38 }, { h: 2 }, { h: 27.5 }, { h: 47.5, accent: true }, { h: 2 },
];

/** Ширины полос штрихкода: чёрная, пробел, чёрная, пробел… */
const BARCODE = [
  3, 2, 1, 3, 4, 2, 2, 2, 1, 4, 3, 1, 2, 3, 5, 2, 1, 2, 3, 3, 2, 1, 4, 3, 1, 2, 2, 2, 3, 4, 1, 1,
  4, 2, 2, 3, 3, 2, 1, 2, 5, 3, 2, 2, 1, 3, 3, 2,
];

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

function Passport() {
  return (
    <Card className="absolute top-0 left-0 h-[626px] w-[495px] overflow-hidden rounded-[28px] p-[2px] shadow-hard">
      <div className="flex h-14 w-[calc(100%+4px)] shrink-0 items-center justify-between bg-ink px-[26px]">
        <span className="text-xs leading-[17px] font-extrabold tracking-[1.5px] whitespace-nowrap text-white">
          ЦИФРОВОЙ ПАСПОРТ · СПОРТ РЯДОМ
        </span>
        <span className="w-[79px] text-xs leading-[17px] font-extrabold tracking-[1px] whitespace-nowrap text-secondary">
          № SR-0048
        </span>
      </div>

      <div className="relative flex h-[566px] w-[calc(100%+4px)] shrink-0 flex-col gap-6 px-[26px] py-7">
        <Img name="memphis.svg" className="top-0 left-0 h-[600px] w-[500px]" />

        <div className="relative flex h-[168px] w-[439px] gap-[22px]">
          <div className="relative flex h-[168px] w-[140px] shrink-0 items-center justify-center rounded-[20px] border-2 border-ink bg-sky">
            <span className="font-display text-[48px] leading-[60px] font-extrabold text-foreground">
              АС
            </span>
            <Badge
              variant="secondary"
              className="absolute top-[146px] left-[95px] h-[26px] text-[13px] leading-[18px]"
            >
              Ур. 7
            </Badge>
          </div>
          <div className="relative h-[161px] w-[221px]">
            <Eyebrow>ИМЯ</Eyebrow>
            <h1 className="absolute top-[18px] left-0 w-[224px] font-display text-[34px] leading-[37.5px] font-extrabold text-foreground">
              Аня
              <br />
              Соколова
            </h1>
            <p className="absolute top-[104px] left-0 text-sm leading-[19px] font-semibold whitespace-nowrap text-muted-foreground">
              @anya.runs · Красноярск
            </p>
            <div className="absolute top-[135px] left-0 flex gap-[6px]">
              <Badge className="bg-lavender-soft text-foreground">Бег</Badge>
              <Badge className="bg-sky-soft text-foreground">Йога</Badge>
              <Badge className="bg-lime-soft text-foreground">Вело</Badge>
            </div>
          </div>
        </div>

        <div className="relative flex h-[86px] w-[439px] gap-[10px]">
          {STATS.map((s) => (
            <div
              key={s.label}
              className={cn(
                "relative h-[86px] w-[139.5px] shrink-0 rounded-2xl border-2 border-transparent",
                s.tone
              )}
            >
              <p className="absolute top-[14px] left-[14px] font-display text-[28px] leading-[35px] font-extrabold text-foreground">
                {s.value}
              </p>
              <p className="absolute top-[51px] left-[14px] text-xs leading-[17px] font-semibold text-foreground opacity-70">
                {s.label}
              </p>
              <RoughBorder radius={16} roughness={0.9} />
            </div>
          ))}
        </div>

        <div className="relative h-[122px] w-[439px] shrink-0 rounded-2xl border-2 border-ink bg-background">
          <Eyebrow className="absolute top-[14px] left-4 leading-[15px]">ОКТЯБРЬ · КМ В ДЕНЬ</Eyebrow>
          <span className="absolute top-[14px] right-[16px] text-xs leading-[17px] font-extrabold text-foreground">
            68 км
          </span>
          <div className="absolute top-[41px] left-4 flex h-[63px] w-[403px] items-end gap-[5px]">
            {BARS.map((b, i) => (
              <span
                key={i}
                className={cn(
                  "w-[16.5px] shrink-0 rounded-t-[4px] border",
                  b.h === 2
                    ? "border-track bg-track"
                    : b.accent
                      ? "border-ink bg-secondary"
                      : "border-ink bg-primary"
                )}
                style={{ height: b.h }}
              />
            ))}
          </div>
        </div>

        <div className="relative flex h-[62px] w-[439px] items-end justify-between">
          <div className="relative h-[62px] w-[213px]">
            <div className="absolute top-0 left-0 flex h-10 gap-[2px]">
              {BARCODE.map((w, i) => (
                <span
                  key={i}
                  className={cn("h-10 shrink-0", i % 2 === 0 && "bg-ink")}
                  style={{ width: w }}
                />
              ))}
            </div>
            <p className="absolute top-12 left-0 font-mono text-xs leading-[14px] font-medium tracking-[1px] whitespace-nowrap text-foreground">
              P&lt;RUS&lt;SOKOLOVA&lt;&lt;ANYA&lt;&lt;0048
            </p>
          </div>
          <Button variant="soft" className="h-10 px-[18px] text-sm leading-[19px]">
            <Icon name="profile/icon-edit" className="size-[18px]" />
            Править
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Pet() {
  const [speechContainer, setSpeechContainer] = useState<HTMLDivElement | null>(null);
  return (
    <Card className="absolute top-0 left-[515px] h-[330px] w-[701px] flex-row items-start overflow-hidden rounded-[28px] bg-sky-soft p-[2px]">
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
    <Card className="absolute top-[646px] left-0 h-[235px] w-[392px] justify-between overflow-hidden rounded-[28px] bg-primary px-[28px] py-[26px]">
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
    <Card className="absolute top-[646px] left-[412px] h-[235px] w-[804px] overflow-hidden">
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
    <Card className="absolute top-[350px] left-[515px] h-[276px] w-[701px] overflow-hidden">
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
        <div className="relative h-[881px] w-[1216px]">
          <Passport />
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
