import { ActivityMobile } from "./activity-mobile";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Disc } from "@/shared/components/ui/disc";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Icon } from "@/shared/components/ui/icon";
import { Progress } from "@/shared/components/ui/progress";
import { cn } from "cn";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";

const XS = "h-9 px-4 text-[13px] leading-[18px]";

const TICKETS = [
  {
    tone: "bg-accent",
    day: "19",
    time: "19:30",
    title: "Вечерний футбол 6×6",
    titleBox: "h-[19px]",
    place: "Стадион «Локомотив»",
    number: "№ 0119",
    qr: "memphis.svg",
    left: "left-[27px]",
  },
  {
    tone: "bg-primary",
    day: "24",
    time: "9:00",
    title: "Пробежка вокруг Татышева",
    titleBox: "h-[37.5px] w-[174px]",
    place: "Остров Татышев",
    number: "№ 0124",
    qr: "memphis1.svg",
    left: "left-[22px]",
  },
];

function Img({ src, className }: { src: string; className?: string }) {
  return <img src={`/activity/${src}`} alt="" className={cn("absolute max-w-none", className)} />;
}

function Dot() {
  return <span className="box-border size-[10px] shrink-0 rounded-[5px] border border-ink bg-accent" />;
}

/** Строка ленты активности: слева значок, в центре текст фиксированной ширины, справа действие. */
function Row({
  tone = "bg-card",
  lead,
  textWidth,
  action,
  dot,
  children,
}: {
  tone?: string;
  lead: React.ReactNode;
  textWidth: string;
  action?: React.ReactNode;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "box-border flex h-[76px] w-[649px] shrink-0 items-center gap-[14px] rounded-[18px] border-2 border-ink px-[18px] py-4",
        tone
      )}
    >
      {lead}
      <div className={cn("shrink-0 text-[15px] leading-[22px] font-medium text-foreground", textWidth)}>
        {children}
      </div>
      {action}
      {dot ? <Dot /> : null}
    </div>
  );
}

const b = "font-extrabold";
const time = (t: string) => <span className="text-muted-foreground"> · {t}</span>;

function IconSquare({ tone, icon }: { tone: string; icon: string }) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-ink",
        tone
      )}
    >
      <Icon name={`activity/${icon}`} className="size-5" />
    </span>
  );
}

function Avatar44({ initials }: { initials: string }) {
  return (
    <Disc
      initials={initials}
      tone="bg-sky"
      className="size-11 shrink-0"
      textClassName="text-sm leading-[19px] tracking-[-0.5px]"
    />
  );
}

function FilterBar() {
  return (
    <div className="relative h-[50px] w-[1216px] shrink-0">
      <h1 className="absolute top-0 left-0 w-[303.5px] font-display text-[40px] leading-[50px] font-extrabold tracking-[-1px] whitespace-nowrap text-foreground">
        Активность
      </h1>
      <div className="absolute top-[6px] left-[327.5px] flex gap-2">
        <Button variant="ink" size="chip" className="hover:translate-x-0 hover:translate-y-0">
          Все
        </Button>
        <Button variant="soft" size="chip" className="w-[111px] justify-start gap-2">
          Заявки
          <span className="flex size-5 items-center justify-center rounded-[10px] bg-accent text-[11px] leading-[15px] font-extrabold text-white">
            1
          </span>
        </Button>
        <Button variant="soft" size="chip">
          Напоминания
        </Button>
        <Button variant="soft" size="chip">
          Подписки
        </Button>
      </div>
      <Badge
        variant="accent"
        className="absolute top-3 left-[1143.5px] text-[13px] leading-[18px] text-white"
      >
        3 новых
      </Badge>
    </div>
  );
}

function Feed() {
  return (
    <Card className="absolute top-0 left-0 h-[626px] w-[701px] overflow-hidden">
      <Eyebrow className="absolute top-6 left-6">СЕГОДНЯ</Eyebrow>
      <div className="absolute top-[51px] left-6 flex flex-col gap-[10px]">
        <Row
          tone="bg-lime-soft"
          lead={<Avatar44 initials="ЛП" />}
          textWidth="w-[364.5px]"
          dot
          action={
            <div className="flex shrink-0 gap-2">
              <Button className={XS}>Принять</Button>
              <Button variant="accent" className={XS}>
                Нет
              </Button>
            </div>
          }
        >
          <span className={b}>Лера Петрова</span> хочет пойти на <span className={b}>«Вечерний футбол 6×6»</span>
          {time("10 мин")}
        </Row>
        <Row
          lead={<IconSquare tone="bg-lavender-soft" icon="icon-clock" />}
          textWidth="w-[446px]"
          dot
          action={
            <Button variant="secondary" className={cn(XS, "shrink-0")}>
              Билет
            </Button>
          }
        >
          Через 2 часа <span className={b}>«Вечерний футбол 6×6»</span>. Сбор в 19:20 у входа
          {time("17:30")}
        </Row>
        <Row lead={<IconSquare tone="bg-sky-soft" icon="icon-heart" />} textWidth="w-[531px]">
          <span className={b}>Дима и ещё 5</span> оценили твою пробежку{time("9:12")}
        </Row>
      </div>

      <Eyebrow className="absolute top-[323px] left-6">ВЧЕРА</Eyebrow>
      <div className="absolute top-[350px] left-6 flex flex-col gap-[10px]">
        <Row
          lead={<Avatar44 initials="СМ" />}
          textWidth="w-[423.5px]"
          action={
            <Button variant="soft" className={cn(XS, "shrink-0", "bg-sky")}>
              Ответить
            </Button>
          }
        >
          <span className={b}>Саша</span> ответила: «В субботу со мной?»{time("21:04")}
        </Row>
        <Row
          lead={<IconSquare tone="bg-secondary" icon="icon-trophy" />}
          textWidth="w-[420.5px]"
          action={
            <Button variant="secondary" className={cn(XS, "shrink-0")}>
              Смотреть
            </Button>
          }
        >
          <span className="relative flex h-[26px] items-center whitespace-nowrap">
            Новый бейдж
            <Badge variant="secondary" className="absolute left-[99px] h-[26px]">
              Серия 7 дней
            </Badge>
            <span className="absolute left-[199.5px]">
              +50 монет{time("20:00")}
            </span>
          </span>
        </Row>
        <Row
          lead={<Avatar44 initials="МС" />}
          textWidth="w-[437px]"
          action={
            <Button variant="soft" className={cn(XS, "shrink-0", "bg-sky")}>
              В ответ
            </Button>
          }
        >
          <span className={b}>Макс Сидоров</span> подписался на тебя{time("14:36")}
        </Row>
      </div>
    </Card>
  );
}

function Tickets() {
  return (
    <Card className="absolute top-0 left-[721px] h-[315px] w-[495px] overflow-hidden">
      <h2 className="absolute top-6 left-6 font-display text-[22px] leading-[27px] font-bold text-foreground">
        Ты идёшь
      </h2>
      <span className="absolute top-8 left-[411px] text-[13px] leading-[18px] font-bold whitespace-nowrap text-muted-foreground">
        2 билета
      </span>
      <div className="absolute top-[67px] left-6 flex w-[443px] flex-col gap-3">
        {TICKETS.map((t) => (
          <div
            key={t.number}
            className="relative box-border flex h-[104px] w-[443px] shrink-0 items-stretch overflow-hidden rounded-[18px] border-2 border-ink bg-card"
          >
            <div className={cn("relative w-[88px] shrink-0 border-r-2 border-dashed border-ink text-white", t.tone)}>
              <p className="absolute inset-x-0 top-[12px] text-center text-[10px] leading-[14px] font-extrabold tracking-[1.5px]">
                ОКТ
              </p>
              <p className="absolute inset-x-0 top-[26px] text-center font-display text-[30px] leading-[37px] font-extrabold">
                {t.day}
              </p>
              <p className="absolute inset-x-0 top-[68px] text-center text-[13px] leading-[18px] font-bold">
                {t.time}
              </p>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              {/* полоса «посадочного талона» */}
              <div className="flex h-[22px] shrink-0 items-center justify-between bg-primary px-3 text-[9px] font-extrabold whitespace-nowrap">
                <span className="tracking-[1.5px] text-secondary">ПОСАДОЧНЫЙ ТАЛОН</span>
                <span className="tracking-[1px] text-white">{t.number}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4">
                <p className="font-display text-[15px] leading-[19px] font-bold text-foreground">{t.title}</p>
                <div className="flex items-center gap-1">
                  <Icon name="activity/icon-pin" className="size-[14px] shrink-0" />
                  <span className="truncate text-[13px] leading-[18px] font-medium text-muted-foreground">
                    {t.place}
                  </span>
                </div>
              </div>
            </div>

            {/* корешок: QR и штамп «допущен» */}
            <div className="relative w-[104px] shrink-0 overflow-hidden border-l-2 border-dashed border-ink bg-secondary">
              <img src="/event/qr.svg" alt="" className="absolute top-[8px] left-[26px] size-[52px] rounded-md border-2 border-ink bg-card p-[3px]" />
              <div className="pointer-events-none absolute bottom-[6px] left-[10px] h-[28px] w-[84px] rotate-[7deg] text-primary">
                <img src="/event/stamp-admitted.svg" alt="" className="absolute inset-0 size-full max-w-none" />
                <p className="absolute inset-x-0 top-[7px] text-center font-display text-[11px] leading-[14px] font-extrabold">
                  ДОПУЩЕН
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Goal() {
  return (
    <Card className="absolute top-[335px] left-[721px] h-[291px] w-[186px] justify-between overflow-hidden bg-secondary p-[26px]">
      <Img src="memphis2.svg" className="top-0 left-0 h-[220px] w-[200px]" />
      <Img src="jump.png" className="top-[91px] left-[89px] h-[92px] w-[85px] object-cover" />
      <div className="relative h-[69px] w-[134px]">
        <Eyebrow className="text-foreground">ЦЕЛЬ НЕДЕЛИ</Eyebrow>
        <p className="absolute top-[19px] left-0 font-display font-extrabold whitespace-nowrap text-foreground">
          <span className="text-[44px] leading-[44px]">4</span>
          <span className="text-[20px] leading-[44px]"> / 5</span>
        </p>
      </div>
      <div className="relative h-14 w-[134px]">
        <p className="w-[120.5px] text-[13px] leading-[18px] font-bold text-foreground">
          ещё одна — и цель закрыта
        </p>
        <Progress value={80} className="absolute top-11 left-0 h-3" />
      </div>
    </Card>
  );
}

function Requests() {
  return (
    <Card className="absolute top-[335px] left-[927px] h-[291px] w-[289px] justify-between overflow-hidden bg-primary p-[26px]">
      <Img src="memphis3.svg" className="top-0 left-0 h-[220px] w-[300px]" />
      <div className="relative h-24 w-[237px]">
        <Eyebrow className="text-lilac">ЗАЯВКИ</Eyebrow>
        <p className="absolute top-[19px] left-0 font-display text-[44px] leading-[55px] font-extrabold text-white">
          1
        </p>
        <p className="absolute top-[77px] left-0 text-sm leading-[19px] font-semibold whitespace-nowrap text-white">
          ждёт ответа на футбол
        </p>
      </div>
      <div className="relative">
        <Button variant="secondary" className="h-10 px-[18px] text-sm leading-[19px]">
          Посмотреть
        </Button>
      </div>
    </Card>
  );
}

export default function ActivityPage() {
  return (
    <>
    <ActivityMobile />
    <div className="relative isolate hidden min-h-dvh overflow-clip bg-background lg:block">
      <MemphisBackground seed="activity" />
      <AppHeader current="activity" />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 px-8 pt-8 pb-12">
        <FilterBar />
        <div className="relative h-[626px] w-[1216px] shrink-0">
          <Feed />
          <Tickets />
          <Goal />
          <Requests />
        </div>
      </main>
    </div>
    </>
  );
}
