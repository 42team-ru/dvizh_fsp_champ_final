import { Link } from "react-router";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Disc } from "@/shared/components/ui/disc";
import { Icon } from "@/shared/components/ui/icon";
import { Progress } from "@/shared/components/ui/progress";
import { RoughBorder } from "@/shared/components/ui/rough-border";
import { cn } from "cn";

const dir = "m-home";

const EVENTS = [
  {
    sport: "БЕГ",
    when: "Сб 9:00",
    dist: "1,8 км",
    title: "Пробежка вокруг Татышева",
    place: "Остров Татышев · средний темп",
    people: [
      { i: "ДК", tone: "bg-sky" },
      { i: "ЛП", tone: "bg-mint" },
      { i: "МС", tone: "bg-peach" },
    ],
    going: 12,
    total: 20,
    tone: "bg-sky",
  },
  {
    sport: "ЙОГА",
    when: "Вс 10:00",
    dist: "2,4 км",
    title: "Йога на набережной",
    place: "Набережная Енисея · любой уровень",
    people: [
      { i: "ЛП", tone: "bg-sky" },
      { i: "КЕ", tone: "bg-mint" },
    ],
    going: 6,
    total: 15,
    tone: "bg-photo-mint",
  },
  {
    sport: "ШАХМАТЫ",
    when: "Сегодня 18:00",
    dist: "0,9 км",
    title: "Шахматы в парке",
    place: "Центральный парк · блиц 5+3",
    people: [
      { i: "МС", tone: "bg-sky" },
      { i: "ТС", tone: "bg-mint" },
    ],
    going: 7,
    total: 10,
    tone: "bg-photo-lilac",
  },
];

const POSTS = [
  {
    i: "ДК",
    tone: "bg-sky",
    name: "Дима Ковалёв",
    meta: "Бег · сегодня в 7:42",
    title: "Утренняя пробежка вдоль Енисея",
    stats: [
      { v: "10,2 км", l: "Дистанция", tone: "bg-lavender-soft" },
      { v: "52:14", l: "Время", tone: "bg-lime-soft" },
      { v: "5:07", l: "Темп /км", tone: "bg-peach" },
    ],
    likes: 25,
    comments: 6,
  },
  {
    i: "СМ",
    tone: "bg-mint",
    name: "Саша Мельникова",
    meta: "Силовая · вчера в 19:10",
    record: true,
    title: "Ноги и спина",
    stats: [
      { v: "80 кг", l: "Присед", tone: "bg-lavender-soft" },
      { v: "45:00", l: "Время", tone: "bg-lime-soft" },
      { v: "12", l: "Подходов", tone: "bg-peach" },
    ],
    likes: 11,
    comments: 3,
  },
];

const tag = "h-auto border-[1.5px] px-[10px] py-1 text-[10px] leading-[normal] font-extrabold tracking-[1px]";

function SectionHead({ title, link }: { title: string; link?: string }) {
  return (
    <div className="flex items-center justify-between px-4 leading-[normal] whitespace-nowrap">
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      {link ? (
        <Link to="/feed" className="text-[13px] font-extrabold text-primary">
          {link}
        </Link>
      ) : null}
    </div>
  );
}

function AppBar() {
  return (
    <div className="flex h-16 shrink-0 items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <img src="/icon.svg" alt="" className="size-9 shrink-0" />
        <span className="font-display text-base leading-[normal] font-bold whitespace-nowrap text-foreground">
          Движ
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/activity"
          aria-label="Активность"
          className="relative box-border flex size-11 items-center justify-center rounded-[22px] border-2 border-ink bg-card"
        >
          <Icon name={`${dir}/icon-bell`} className="size-5" />
          <span className="absolute top-[6px] left-6 box-border size-3 rounded-[6px] border-[1.5px] border-ink bg-accent" />
        </Link>
        <Link to="/profile" aria-label="Профиль">
          <Disc
            initials="АС"
            tone="bg-sky"
            className="size-11"
            textClassName="text-xs leading-[normal]"
          />
        </Link>
      </div>
    </div>
  );
}

function NextTicket() {
  return (
    <div className="px-4">
      <div className="box-border w-full overflow-hidden rounded-[26px] border-2 border-ink bg-primary shadow-[4px_4px_0_var(--ink)]">
        <div className="flex flex-col gap-[10px] px-5 pt-5 pb-[14px]">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className={tag}>
              ФУТБОЛ
            </Badge>
            <span className="text-[13px] leading-[normal] font-bold whitespace-nowrap text-lilac">
              через 2 часа
            </span>
          </div>
          <p className="font-display text-[22px] leading-7 font-extrabold text-white">
            Вечерний футбол 6×6
          </p>
          <div className="flex items-center gap-[6px]">
            <Icon name={`${dir}/icon-pin`} className="size-4" />
            <span className="text-sm leading-[normal] font-medium whitespace-nowrap text-lilac">
              Стадион «Локомотив» · 3,2 км
            </span>
          </div>
          <Button variant="secondary" className="h-12 w-full px-5 shadow-none">
            Открыть билет
          </Button>
        </div>
        <div className="relative h-[22px] bg-card">
          <img
            src={`/${dir}/dash.svg`}
            alt=""
            className="absolute top-[10px] right-[29px] left-[29px] h-[2px] w-[calc(100%-58px)] max-w-none"
          />
          <span className="absolute top-0 left-[-11px] box-border size-[22px] rounded-[11px] border-2 border-ink bg-background" />
          <span className="absolute top-0 right-[-11px] box-border size-[22px] rounded-[11px] border-2 border-ink bg-background" />
        </div>
        <div className="flex items-center gap-3 bg-card px-5 pt-1 pb-[18px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[10px] leading-[normal] font-extrabold whitespace-nowrap">
            <div className="flex flex-col gap-[2px]">
              <span className="text-[10px] tracking-[1px] text-muted-foreground">КОГДА</span>
              <span className="text-sm text-foreground">Сегодня, 19:30</span>
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="text-[10px] tracking-[1px] text-muted-foreground">СБОР</span>
              <span className="text-sm text-foreground">19:20 у входа на стадион</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <img src={`/${dir}/qr.svg`} alt="" className="size-[63px]" />
            <span className="text-[10px] leading-[normal] font-extrabold tracking-[1px] whitespace-nowrap text-muted-foreground">
              № 0119
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tip() {
  return (
    <div className="px-4">
      <div className="box-border flex w-full flex-col gap-3 rounded-[22px] border-2 border-ink bg-sky-soft p-[14px]">
        <div className="flex items-center gap-3">
          <img src={`/${dir}/img.png`} alt="" className="size-16 shrink-0 object-contain" />
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-[10px] leading-[normal] font-extrabold tracking-[1.2px] whitespace-nowrap text-primary">
              БУБЛИК ПОДСКАЗЫВАЕТ
            </span>
            <span className="text-sm leading-[19px] font-bold text-foreground">
              Выходить пора в 19:00 — до стадиона 25 минут пешком
            </span>
          </div>
        </div>
        <div className="flex gap-[10px]">
          <Button className="h-12 min-w-0 flex-1 px-5 text-sm">Напомнить</Button>
          <Button variant="soft" rough={false} className="h-12 min-w-0 flex-1 px-5 text-sm">
            Не надо
          </Button>
        </div>
      </div>
    </div>
  );
}

function EventScroller() {
  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
      {EVENTS.map((e) => (
        <Card key={e.title} className="w-[290px] shrink-0 overflow-hidden rounded-[22px]">
          <div className={cn("relative h-[120px] shrink-0 overflow-hidden", e.tone)}>
            <img
              src={`/${dir}/photo-decor.svg`}
              alt=""
              className="absolute top-0 left-0 h-[120px] w-[290px] max-w-none"
            />
            <Badge
              variant="outline"
              className={cn(tag, "absolute top-3 left-3 border-[1.5px] bg-card")}
            >
              {e.sport}
            </Badge>
            <span className="absolute top-3 right-3 rounded-pill bg-ink px-[10px] py-1 text-[11px] leading-[normal] font-extrabold tracking-[1px] whitespace-nowrap text-secondary">
              {e.when}
            </span>
            <span className="absolute top-[81px] left-3 box-border flex items-center gap-1 rounded-pill border-[1.5px] border-ink bg-card py-1 pr-[10px] pl-2">
              <Icon name={`${dir}/icon-pin1`} className="size-[13px]" />
              <span className="text-xs leading-[normal] font-bold text-foreground">{e.dist}</span>
            </span>
          </div>
          <div className="flex flex-col gap-2 p-[14px]">
            <p className="font-display text-[15px] leading-[21px] font-bold text-foreground">
              {e.title}
            </p>
            <p className="text-[13px] leading-[18px] font-medium text-muted-foreground">
              {e.place}
            </p>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="flex items-center">
                {e.people.map((p, i) => (
                  <Disc
                    key={p.i}
                    initials={p.i}
                    tone={p.tone}
                    className={cn("size-7", i < e.people.length - 1 && "mr-[-8px]")}
                    textClassName="text-xs leading-[normal]"
                  />
                ))}
              </span>
              <span className="text-[13px] leading-[normal] font-bold text-foreground">
                Идут {e.going} из {e.total}
              </span>
              <span className="ml-auto text-xs leading-[normal] font-extrabold text-muted-foreground">
                осталось {e.total - e.going}
              </span>
            </div>
            <Progress value={(e.going / e.total) * 100} className="bg-card" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function Posts() {
  return (
    <>
      {POSTS.map((p) => (
        <div key={p.name} className="px-4">
          <Card className="gap-3 rounded-[22px] p-4">
            <div className="flex items-center gap-[10px]">
              <Disc
                initials={p.i}
                tone={p.tone}
                className="size-11"
                textClassName="text-xs leading-[normal]"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-px leading-[normal] whitespace-nowrap">
                <span className="text-[15px] font-extrabold text-foreground">{p.name}</span>
                <span className="text-[13px] font-medium text-muted-foreground">{p.meta}</span>
              </div>
              <Icon name={`${dir}/icon-more`} className="size-[22px]" />
            </div>
            {p.record ? (
              <Badge variant="secondary" className={cn(tag, "w-fit")}>
                НОВЫЙ РЕКОРД
              </Badge>
            ) : null}
            <p className="font-display text-base leading-[21px] font-bold text-foreground">
              {p.title}
            </p>
            <div className="flex gap-2 leading-[normal] font-bold whitespace-nowrap">
              {p.stats.map((s) => (
                <div
                  key={s.l}
                  className={cn(
                    "relative box-border flex min-w-0 flex-1 flex-col gap-[2px] rounded-[14px] border-[1.5px] border-transparent px-3 py-[10px]",
                    s.tone
                  )}
                >
                  <span className="font-display text-[15px] text-foreground">{s.v}</span>
                  <span className="text-[11px] text-muted-foreground">{s.l}</span>
                  <RoughBorder radius={14} strokeWidth={1.5} roughness={0.8} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              {[
                { icon: "icon-heart", n: p.likes },
                { icon: "icon-chat", n: p.comments },
              ].map((r) => (
                <span key={r.icon} className="flex h-11 items-center gap-[6px]">
                  <Icon name={`${dir}/${r.icon}`} className="size-5" />
                  <span className="text-sm leading-[normal] font-extrabold text-foreground">
                    {r.n}
                  </span>
                </span>
              ))}
            </div>
          </Card>
        </div>
      ))}
    </>
  );
}

export function HomeMobile() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col gap-4 overflow-hidden bg-background pb-[110px] lg:hidden">
      <MemphisBackground variant="mobile" />
      <AppBar />
      <div className="flex flex-col gap-[2px] px-4 pt-1 leading-[normal] whitespace-nowrap">
        <h1 className="font-display text-[26px] font-extrabold text-foreground">Привет, Аня!</h1>
        <p className="text-[15px] font-medium text-muted-foreground">Дальше у тебя</p>
      </div>
      <NextTicket />
      <Tip />
      <SectionHead title="Другие события" link="Все" />
      <EventScroller />
      <SectionHead title="Друзья в движении" />
      <Posts />
      <MobileTabBar current="home" />
    </div>
  );
}
