import { Link } from "react-router";
import { EventMobile } from "./event-mobile";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { Disc } from "@/shared/components/ui/disc";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Icon } from "@/shared/components/ui/icon";
import { Progress } from "@/shared/components/ui/progress";
import { RoughBorder } from "@/shared/components/ui/rough-border";
import { cn } from "cn";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";

const FACTS = [
  {
    icon: "icon-clock",
    label: "КОГДА",
    value: "Сб, 24 окт",
    lines: ["9:00–10:30", "через 5 дней"],
    width: "w-[199.5px]",
  },
  {
    icon: "icon-pin",
    label: "ГДЕ",
    value: "о. Татышев",
    lines: ["вход с Коммунального", "моста · 1,8 км"],
    width: "w-[201.5px] border-l-2 border-dashed border-track",
  },
  {
    icon: "icon-route",
    label: "МАРШРУТ",
    value: "8 км",
    lines: ["темп 5:30–6:00 /км", "круг по острову"],
    width: "w-[201.5px] border-l-2 border-dashed border-track",
  },
];

const GOING = [
  { initials: "ДК", name: "Дима", tone: "bg-sky" },
  { initials: "ЛП", name: "Лера", tone: "bg-lime-soft" },
  { initials: "МС", name: "Макс", tone: "bg-lavender-soft" },
  { initials: "КЕ", name: "Катя", tone: "bg-peach" },
  { initials: "ТС", name: "Тёма", tone: "bg-mint-soft" },
  { initials: "РМ", name: "Рома", tone: "bg-sky" },
  { initials: "ОК", name: "Оля", tone: "bg-lime-soft" },
];
const GOING_LEFT = [0, 114, 227.5, 341.5];

const MESSAGES = [
  { initials: "ДК", who: "Дима", time: "10:12", text: "Собираемся у таблички с картой острова, жду до 9:05.", top: 69, w: "w-[430.5px]", own: true },
  { initials: "ЛП", who: "Лера", time: "11:40", text: "Можно с собакой? Она спокойная и бегает рядом.", top: 155, w: "w-[397.5px]" },
  { initials: "ДК", who: "Дима", time: "11:52", text: "Конечно, только на поводке у моста — там велосипедисты.", top: 240.5, w: "w-[461.5px]", own: true },
  { initials: "МС", who: "Макс", time: "12:30", text: "Я впервые на 8 км, догоню на втором круге", top: 326.5, w: "w-[347px]" },
];

const TAKE = [
  { label: "Вода", tone: "bg-lime-soft" },
  { label: "Светоотражатели", tone: "bg-lavender-soft" },
  { label: "Удобные кроссовки", tone: "bg-sky-soft" },
  { label: "Ветровка", tone: "bg-mint-soft" },
];

function Img({ src, className }: { src: string; className?: string }) {
  return <img src={`/event/${src}`} alt="" className={cn("absolute max-w-none", className)} />;
}

function TopBar() {
  return (
    <div className="flex h-10 w-[1216px] shrink-0 items-center justify-between">
      <Button asChild variant="soft" className="h-10 px-[18px] text-sm leading-[19px]">
        <Link to="/feed">
          <Icon name="event/icon-back" className="size-[18px]" />К ленте
        </Link>
      </Button>
      <div className="flex h-10 w-[148px] items-start">
        <Button variant="soft" className="h-10 shrink-0 px-[18px] text-sm leading-[19px]">
          <Icon name="event/icon-share" className="size-[18px]" />
          Поделиться
        </Button>
      </div>
    </div>
  );
}

function TicketHero() {
  return (
    <Card className="relative h-[400px] w-[1216px] shrink-0 flex-row items-start overflow-hidden rounded-[28px] p-0 shadow-hard">
      <div className="relative h-[396px] w-[270px] shrink-0 overflow-hidden border-r-2 border-ink">
        <img src="/event/box.png" alt="" className="absolute top-0 left-0 h-[396px] w-[268px] object-cover" />
        <div className="absolute top-0 left-0 h-[396px] w-[268px] bg-gradient-to-b from-[rgba(22,24,31,0.05)] via-[rgba(22,24,31,0.15)] via-55% to-[rgba(22,24,31,0.7)]" />
        <div className="absolute top-[18px] left-[18px] flex gap-[6px]">
          <Badge variant="outline">Бег</Badge>
          <Badge variant="outline">Средний уровень</Badge>
        </div>
        <div className="absolute top-[339px] left-5 w-[152px]">
          <Eyebrow className="text-white opacity-90">ОРГАНИЗАТОР</Eyebrow>
          <p className="mt-1 font-display text-base leading-5 font-bold whitespace-nowrap text-white">
            Дима Ковалёв
          </p>
        </div>
      </div>

      {/* полоса «посадочного талона» над основной частью билета */}
      <div className="absolute top-0 left-[270px] z-10 flex h-10 w-[642px] items-center justify-between bg-primary px-8 text-[11px] font-extrabold whitespace-nowrap">
        <span className="tracking-[2px] text-secondary">ПОСАДОЧНЫЙ ТАЛОН · ТРЕНИРОВКА</span>
        <img src="/event/dots.svg" alt="" className="absolute left-[340px] h-[26px] w-[40px] max-w-none" />
        <span className="tracking-[1.5px] text-white">БИЛЕТ № 0124 · БЕСПЛАТНО</span>
      </div>

      <div className="flex h-[396px] w-[642px] shrink-0 flex-col items-start justify-between pt-[64px] pr-[30px] pb-[26px] pl-[10px]">
        <div className="relative h-[86px] w-[602px]">
          <h1 className="absolute top-0 left-5 w-[454.5px] font-display text-[40px] leading-[43px] font-extrabold tracking-[-1px] text-foreground">
            Пробежка вокруг
            <br />
            Татышева
          </h1>
        </div>

        <div className="flex h-[87px] w-[602px]">
          {FACTS.map((f) => (
            <div key={f.label} className={cn("relative h-[87px] shrink-0", f.width)}>
              <div className="absolute top-0 left-5 flex h-4 items-center gap-[6px]">
                <Icon name={`event/${f.icon}`} className="size-4" />
                <Eyebrow>{f.label}</Eyebrow>
              </div>
              <p className="absolute top-[23px] left-5 font-display text-[19px] leading-6 font-bold whitespace-nowrap text-foreground">
                {f.value}
              </p>
              <p className="absolute top-[51px] left-5 text-[13px] leading-[18px] font-semibold text-muted-foreground">
                {f.lines[0]}
                <br />
                {f.lines[1]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex h-[396px] w-[300px] shrink-0 flex-col items-start justify-between overflow-hidden bg-secondary pt-[50px] pr-[26px] pb-[26px] pl-8">
        <Img src="memphis.svg" className="top-0 left-0 h-[400px] w-[300px]" />
        <span className="absolute top-[14px] left-8 text-[10px] font-extrabold tracking-[2px] text-foreground">
          КОНТРОЛЬ
        </span>
        <span className="absolute top-[14px] right-[26px] text-[10px] font-extrabold tracking-[1px] text-foreground">
          № 0124
        </span>
        {/* штамп организатора: запись подтверждена */}
        <div className="pointer-events-none absolute top-[220px] left-[34px] h-[66px] w-[178px] rotate-[9deg] text-primary">
          <img src="/event/stamp-admitted.svg" alt="" className="absolute inset-0 size-full max-w-none" />
          <p className="absolute inset-x-0 top-3 text-center font-display text-[20px] font-extrabold">ДОПУЩЕН</p>
          <p className="absolute inset-x-0 top-10 text-center text-[9px] font-extrabold tracking-[1px]">
            орг. Дима К. · 18.10
          </p>
        </div>
        <div className="relative h-[143px] w-[242px]">
          <Eyebrow className="text-foreground">УЧАСТНИКИ</Eyebrow>
          <p className="absolute top-[14px] left-0 font-display text-[54px] leading-[67px] font-extrabold text-foreground">
            12
          </p>
          <span className="absolute top-[47px] left-[81px] text-xl leading-[27px] font-bold text-foreground">
            / 20
          </span>
          <Progress value={60} className="absolute top-[89px] left-0 h-3" />
          <div className="absolute top-[113px] left-0 h-[30px] w-[242px]">
            {GOING.slice(0, 4).map((g, i) => (
              <Disc
                key={g.initials}
                initials={g.initials}
                tone={g.tone}
                className="absolute top-0 size-[30px]"
                textClassName="text-[10px] leading-[14px]"
                style={{ left: i * 22 }}
              />
            ))}
            <span className="absolute top-[6px] left-[104px] text-[13px] leading-[18px] font-bold whitespace-nowrap text-muted-foreground">
              и ещё 8
            </span>
          </div>
        </div>
        <div className="relative h-[81px] w-[242px]">
          <Button variant="ink" className="h-[54px] w-[242px] px-7 text-base leading-[22px]">
            Записаться
          </Button>
          <p className="absolute top-[64px] left-0 w-full text-center text-xs leading-[17px] font-semibold text-foreground">
            Отменить можно в любой момент
          </p>
        </div>
      </div>

      <div className="absolute top-[26px] left-[912px] h-[344px] w-[2px] border-l-2 border-dashed border-ink" />
      <span className="absolute top-[-15px] left-[897px] box-border size-[30px] rounded-[15px] border-2 border-ink bg-background" />
      <span className="absolute top-[381px] left-[897px] box-border size-[30px] rounded-[15px] border-2 border-ink bg-background" />
    </Card>
  );
}

function About() {
  return (
    <Card className="absolute top-0 left-0 h-[286.5px] w-[701px] overflow-hidden">
      <h2 className="absolute top-7 left-7 font-display text-[22px] leading-[27px] font-bold text-foreground">
        О пробежке
      </h2>
      <p className="absolute top-[70px] left-7 w-[513px] text-base leading-[25.5px] font-medium text-foreground">
        Бежим спокойно, в разговорном темпе, никого не бросаем. После финиша по желанию — кофе у моста.
      </p>
      <p className="absolute top-[131px] left-7 w-[320px] text-base leading-[25.5px] font-medium text-muted-foreground">
        Возьми воду и что-то светоотражающее: утром на острове ещё сумрачно.
      </p>
      <Eyebrow className="absolute top-[203.5px] left-7">ЧТО ВЗЯТЬ</Eyebrow>
      <div className="absolute top-[228.5px] left-7 flex gap-2">
        {TAKE.map((t) => (
          <Badge key={t.label} className={cn("text-[13px] leading-[18px] text-foreground", t.tone)}>
            {t.label}
          </Badge>
        ))}
      </div>
      <Img src="wave.png" className="top-[164.5px] left-[557px] h-[118px] w-[114px] object-cover" />
      <div className="absolute top-36 left-[349px] box-border h-[68.5px] w-[200px] rounded-[18px] border-2 border-ink bg-card">
        <p className="absolute top-3 left-4 w-[151.5px] text-sm leading-[20.5px] font-semibold text-foreground">
          Напомню за 2 часа до старта
        </p>
        <span className="absolute top-[19px] left-[188px] box-border size-5 border-r-2 border-b-2 border-ink bg-card" />
      </div>
    </Card>
  );
}

function Organizer() {
  return (
    <Card className="absolute top-0 left-[721px] h-[286.5px] w-[495px] overflow-hidden bg-sky-soft">
      <div className="absolute top-[22px] left-[22px] flex h-14 w-[447px] items-center gap-[14px]">
        <Disc
          initials="ДК"
          tone="bg-sky"
          className="size-14"
          textClassName="text-[19px] leading-[26px] tracking-[-0.5px]"
        />
        <div>
          <p className="text-[17px] leading-[23px] font-extrabold text-foreground">Дима Ковалёв</p>
          <p className="text-[13px] leading-[18px] font-medium text-muted-foreground">
            Организатор · 14 пробежек
          </p>
        </div>
      </div>
      <div className="absolute top-24 left-[22px] flex h-[61px] w-[447px] gap-2">
        {[
          { v: "4,9", l: "рейтинг", tone: "bg-lime-soft" },
          { v: "212", l: "участников", tone: "bg-background" },
        ].map((s) => (
          <div
            key={s.l}
            className={cn("relative h-[61px] w-[219.5px] rounded-[14px] border-2 border-transparent", s.tone)}
          >
            <p className="absolute top-[10px] left-3 font-display text-lg leading-[22px] font-extrabold text-foreground">
              {s.v}
            </p>
            <p className="absolute top-8 left-3 text-[11px] leading-[15px] font-semibold text-muted-foreground">
              {s.l}
            </p>
            <RoughBorder radius={14} roughness={0.9} />
          </div>
        ))}
      </div>
      <Button variant="soft" className="absolute top-[173px] left-[22px] w-[447px]">
        <Icon name="event/icon-plus1" className="size-[18px]" />
        Подписаться
      </Button>
    </Card>
  );
}

function RouteMap() {
  return (
    <Card className="absolute top-[306.5px] left-[721px] h-[290px] w-[495px] overflow-hidden bg-mint-soft">
      <Img src="memphis1.svg" className="top-0 left-0 h-[300px] w-[620px]" />
      <Badge variant="outline" className="absolute top-[18px] left-[18px] text-[13px] leading-[18px]">
        <Icon name="event/icon-route1" className="size-[14px]" />
        Маршрут · 8 км
      </Badge>
      <div className="absolute top-[228px] left-[18px] flex h-10 w-[455px] items-center justify-between">
        <Badge variant="outline" className="text-[13px] leading-[18px]">
          <Icon name="event/icon-pin1" className="size-[14px]" />
          Старт: табличка с картой острова
        </Badge>
        <Button variant="soft" className="h-10 px-[18px] text-sm leading-[19px]">
          Открыть карту
        </Button>
      </div>
    </Card>
  );
}

function Chat() {
  return (
    <Card className="absolute top-[306.5px] left-0 h-[559px] w-[701px] overflow-hidden">
      <div className="absolute top-[26px] left-[26px] flex h-[27px] w-[645px] items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <Icon name="event/icon-chat" className="size-[22px]" />
          <h2 className="font-display text-[22px] leading-[27px] font-bold text-foreground">
            Чат события
          </h2>
        </div>
        <span className="text-[13px] leading-[18px] font-bold text-muted-foreground">18 сообщений</span>
      </div>
      {MESSAGES.map((m) => (
        <div
          key={m.top}
          className="absolute left-[26px] flex h-[70px] w-[645px] items-start gap-3"
          style={{ top: m.top }}
        >
          <Disc
            initials={m.initials}
            tone="bg-sky"
            className="size-9 shrink-0"
            textClassName="text-xs leading-[17px]"
          />
          <div
            className={cn(
              "relative box-border h-[70px] rounded-tl-[4px] rounded-tr-[18px] rounded-br-[18px] rounded-bl-[18px] border-2 border-ink",
              m.own ? "bg-lime-soft" : "bg-card",
              m.w
            )}
          >
            <p className="absolute top-3 left-4 text-[13px] leading-[18px] whitespace-nowrap">
              <span className="font-extrabold text-foreground">{m.who} </span>
              <span className="font-semibold text-muted-foreground">· {m.time}</span>
            </p>
            <p className="absolute top-8 left-4 text-[15px] leading-[22px] font-medium whitespace-nowrap text-foreground">
              {m.text}
            </p>
          </div>
        </div>
      ))}
      <div className="absolute top-[414px] left-[26px] box-border flex h-12 w-[645px] items-center gap-[10px] rounded-pill border-2 border-dashed border-ink bg-background px-5">
        <Icon name="event/icon-lock" className="size-[18px]" />
        <span className="text-sm leading-[19px] font-semibold whitespace-nowrap text-muted-foreground">
          Писать могут участники — запишись, и чат откроется
        </span>
      </div>
    </Card>
  );
}

function Going() {
  return (
    <Card className="absolute top-[616.5px] left-[721px] h-[249px] w-[495px] overflow-hidden">
      <div className="absolute top-6 left-6 flex h-[25px] w-[443px] items-center justify-between">
        <h2 className="font-display text-xl leading-[25px] font-bold text-foreground">Кто идёт</h2>
        <span className="text-[13px] leading-[18px] font-bold text-muted-foreground">12 из 20</span>
      </div>
      <div className="absolute top-[67px] left-6 h-[154px] w-[443px]">
        {GOING.map((g, i) => (
          <div
            key={g.name}
            className="absolute flex h-[71px] w-[102px] flex-col items-center gap-[6px]"
            style={{ left: GOING_LEFT[i % 4], top: i < 4 ? 0 : 83 }}
          >
            <Disc
              initials={g.initials}
              tone={g.tone}
              className="size-12"
              textClassName="text-base leading-[22px] tracking-[-0.5px]"
            />
            <span className="text-xs leading-[17px] font-bold text-foreground">{g.name}</span>
          </div>
        ))}
        <div
          className="absolute flex h-[71px] w-[102px] flex-col items-center gap-[6px]"
          style={{ left: 341.5, top: 83 }}
        >
          <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-ink text-sm leading-[19px] font-extrabold text-foreground">
            +5
          </span>
          <span className="text-xs leading-[17px] font-bold text-muted-foreground">ещё</span>
        </div>
      </div>
    </Card>
  );
}

export default function EventPage() {
  return (
    <>
    <EventMobile />
    <div className="relative isolate hidden min-h-dvh overflow-clip bg-background lg:block">
      <MemphisBackground seed="event" />
      <AppHeader current="feed" />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col items-center gap-7 px-8 pt-8 pb-12">
        <TopBar />
        <TicketHero />
        <div className="relative h-[865.5px] w-[1216px] shrink-0">
          <About />
          <Organizer />
          <RouteMap />
          <Chat />
          <Going />
        </div>
      </main>
    </div>
    </>
  );
}
