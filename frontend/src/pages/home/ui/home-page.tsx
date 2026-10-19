import { Link } from "react-router";
import { HomeMobile } from "./home-mobile";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Icon } from "@/shared/components/ui/icon";
import { Participants } from "@/shared/components/ui/participants";
import { Progress } from "@/shared/components/ui/progress";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";

const WEEK = [
  { day: "Пн", state: "done" },
  { day: "Вт", state: "empty" },
  { day: "Ср", state: "done" },
  { day: "Чт", state: "done" },
  { day: "Пт", state: "empty" },
  { day: "Сб", state: "today" },
  { day: "Вс", state: "done" },
] as const;

const EVENTS = [
  {
    sport: "Бег",
    time: "Сб 9:00",
    distance: "1,8 км от тебя",
    title: "Пробежка вокруг Татышева",
    place: "Остров Татышев · средний темп",
    people: ["ДК", "ЛП", "МС"],
    going: 12,
    total: 20,
    cover: { photo: "/home/box.png" },
  },
  {
    sport: "Футбол",
    time: "Сегодня 19:30",
    distance: "3,2 км от тебя",
    title: "Вечерний футбол 6×6",
    place: "Стадион «Локомотив» · любители",
    people: ["ИВ", "АР", "ОТ"],
    going: 11,
    total: 14,
    cover: { bg: "bg-orange", art: "/home/memphis3.svg" },
  },
  {
    sport: "Йога",
    time: "Вс 10:00",
    distance: "2,4 км от тебя",
    title: "Йога на набережной",
    place: "Набережная Енисея · любой уровень",
    people: ["ЛП", "КЕ"],
    going: 6,
    total: 15,
    cover: { bg: "bg-sky", art: "/home/memphis4.svg" },
  },
];

const FRIENDS = [
  {
    initials: "ДК",
    name: "Дима Ковалёв",
    meta: "Бег · сегодня в 7:42",
    title: "Утренняя пробежка вдоль Енисея",
    likes: 25,
    comments: 6,
    heartIcon: "icon-heart",
    stats: [
      { value: "10,2 км", label: "Дистанция", tone: "bg-lime-soft" },
      { value: "52:14", label: "Время", tone: "bg-background" },
      { value: "5:07", label: "Темп /км", tone: "bg-background" },
    ],
    media: { bg: "bg-mint-soft", art: "/home/memphis5.svg", artWidth: "w-[520px]", record: false },
  },
  {
    initials: "СМ",
    name: "Саша Мельникова",
    meta: "Силовая · вчера в 19:10",
    title: "Ноги и спина",
    likes: 11,
    comments: 3,
    heartIcon: "icon-heart1",
    stats: [
      { value: "45:00", label: "Время", tone: "bg-background" },
      { value: "12", label: "Подходов", tone: "bg-background" },
      { value: "80 кг", label: "Присед", tone: "bg-sky-soft" },
    ],
    media: { bg: "bg-lime-soft", art: "/home/memphis6.svg", artWidth: "w-[560px]", record: true },
  },
];

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`text-[11px] leading-[15px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase ${className ?? ""}`}
    >
      {children}
    </p>
  );
}

function SectionHeading({
  title,
  hint,
  linkLabel,
}: {
  title: string;
  hint?: string;
  linkLabel: string;
}) {
  return (
    <div className="flex h-8 items-center justify-between">
      <div className="flex items-start gap-3">
        <h2 className="min-w-[240.5px] font-display text-[26px] leading-8 font-bold tracking-[-0.5px] text-foreground">
          {title}
        </h2>
        {hint ? (
          <span className="mt-[11px] text-sm leading-[19px] font-bold text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
      <Link
        to="/"
        className="flex items-center gap-[6px] text-sm leading-[19px] font-extrabold text-foreground"
      >
        {linkLabel}
        <Icon name="icon-arrow1" className="size-4" />
      </Link>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative box-border h-[330px] overflow-hidden rounded-[28px] border-2 border-ink bg-primary">
      <img src="/home/memphis.svg" alt="" className="absolute top-0 left-0 h-[330px] w-[1216px] max-w-none" />

      <div className="absolute top-[44px] left-[44px] w-[600px]">
        <p className="text-[15px] leading-[21px] font-bold text-white opacity-90">
          Привет, Аня! Дальше у тебя
        </p>
        <h1 className="mt-[6px] font-display text-[52px] leading-[54.5px] font-extrabold tracking-[-1px] text-white">
          Вечерний
          <br />
          футбол 6×6
        </h1>
        <div className="mt-[26px] flex gap-2">
          <Badge variant="outline" className="text-[13px] leading-[18px]">
            <Icon name="icon-clock" className="size-[14px]" />
            19:30
          </Badge>
          <Badge variant="outline" className="text-[13px] leading-[18px]">
            <Icon name="icon-pin" className="size-[14px]" />
            Стадион «Локомотив»
          </Badge>
          <Badge variant="outline" className="text-[13px] leading-[18px]">
            <Icon name="icon-route" className="size-[14px]" />
            3,2 км
          </Badge>
        </div>
        <div className="mt-[26px] flex gap-3">
          <Button variant="secondary" size="lg">
            Открыть билет
          </Button>
          <Button variant="clear" size="lg" className="border-white">
            <Icon name="icon-arrow" className="size-[18px]" />
            Другие события
          </Button>
        </div>
      </div>

      <article className="absolute top-[42px] left-[800px] box-border h-[244px] w-[356px] overflow-hidden rounded-[22px] border-2 border-ink bg-card p-[2px] shadow-hard">
        <div className="relative h-[118px] w-[352px] shrink-0 overflow-hidden border-b-2 border-ink">
          <div className="absolute inset-x-0 top-0 h-[116px] bg-orange">
            <img
              src="/home/memphis1.svg"
              alt=""
              className="absolute top-[-74px] left-0 h-[264px] w-[352px] max-w-none"
            />
          </div>
          <div className="absolute inset-x-0 top-0 h-[116px] bg-gradient-to-b from-transparent from-40% to-[rgba(22,24,31,0.55)]" />
          <Badge variant="outline" className="absolute top-3 left-[14px]">
            Футбол
          </Badge>
          <p className="absolute top-[91px] left-4 text-[11px] leading-[15px] font-extrabold tracking-[1.5px] text-white">
            БИЛЕТ № 0119
          </p>
        </div>
        <div className="relative flex h-[122px] w-[352px] shrink-0">
          <div className="flex w-[248px] flex-col justify-between px-4 py-[14px]">
            <div>
              <Eyebrow>КОГДА</Eyebrow>
              <p className="mt-1 font-display text-[17px] leading-[21px] font-bold text-foreground">
                Сегодня, 19:30
              </p>
            </div>
            <div>
              <Eyebrow>СБОР</Eyebrow>
              <p className="mt-[2px] text-sm leading-[19px] font-bold text-foreground">
                19:20 у входа на стадион
              </p>
            </div>
          </div>
          <div className="absolute top-3 left-[252px] h-[98px] w-[2px] border-l-2 border-dashed border-ink" />
          <span className="absolute top-[-11px] left-[241px] box-border size-[22px] rounded-[11px] border-2 border-ink bg-card" />
          <div className="flex w-[104px] items-center justify-center">
            <img src="/home/memphis2.svg" alt="" className="size-[76px]" />
          </div>
        </div>
      </article>
    </section>
  );
}

function Tip() {
  return (
    <Card className="relative h-[104px] flex-row items-center gap-5 bg-mint-soft pr-[26px] pl-[152px]">
      <img
        src="/home/wave.png"
        alt=""
        className="pointer-events-none absolute top-[-30px] left-[18px] h-[128px] w-[124px] max-w-none object-cover"
      />
      <div className="w-[738.5px] shrink-0">
        <Eyebrow>БУБЛИК ПОДСКАЗЫВАЕТ</Eyebrow>
        <p className="mt-[6px] font-display text-[18px] leading-[23.5px] font-bold whitespace-nowrap text-foreground">
          Выходить пора в 19:00 — до стадиона 25 минут пешком
        </p>
      </div>
      <Button variant="ink">
        <Icon name="icon-bell1" className="size-[18px]" />
        Напомнить
      </Button>
      <Button variant="soft">Не надо</Button>
    </Card>
  );
}

function Week() {
  return (
    <Card className="h-[111px] overflow-hidden p-[22px]">
      <div className="flex h-[63px] items-center gap-10">
        <div className="w-[144px] shrink-0">
          <p className="font-display text-[18px] leading-[22px] font-bold whitespace-nowrap text-foreground">
            Твоя неделя
          </p>
          <p className="mt-1 text-[13px] leading-[18px] font-semibold text-muted-foreground">
            13–19 окт
          </p>
        </div>

        <div className="flex w-[388px] shrink-0 gap-[18px]">
          {WEEK.map(({ day, state }) => (
            <div key={day} className="flex w-10 flex-col items-center gap-[6px]">
              <span
                className={`flex size-10 items-center justify-center rounded-[20px] border-2 border-ink ${
                  state === "done" ? "bg-secondary" : state === "today" ? "bg-primary" : "bg-card"
                }`}
              >
                {state === "done" ? <Icon name="icon-check" className="size-[18px]" /> : null}
                {state === "today" ? <Icon name="icon-run1" className="size-[18px]" /> : null}
              </span>
              <span className="text-xs leading-[17px] font-bold text-muted-foreground">{day}</span>
            </div>
          ))}
        </div>

        <div className="flex h-[55px] w-[301px] shrink-0 flex-col gap-2">
          <div className="relative h-[35px]">
            <p className="font-display leading-[17.5px] font-extrabold text-foreground">
              <span className="text-[28px]">4</span>
              <span className="font-sans text-base font-bold text-muted-foreground"> из 5 тренировок</span>
            </p>
            <span className="absolute top-[14px] left-[187px] text-[13px] leading-[18px] font-bold whitespace-nowrap text-muted-foreground">
              ещё одна до цели
            </span>
          </div>
          <Progress value={80} className="h-3" />
        </div>

        <Button variant="soft" className="shrink-0">
          <Icon name="icon-coin" className="size-[18px]" />
          Бублик ждёт монет
        </Button>
      </div>
    </Card>
  );
}

function EventCard({ event }: { event: (typeof EVENTS)[number] }) {
  const { cover } = event;
  return (
    <Card className="h-[323.5px] overflow-hidden p-[2px]">
      <div className="relative h-[180px] w-[388px] shrink-0 overflow-hidden border-b-2 border-ink">
        <div className={`absolute inset-x-0 top-0 h-[178px] ${"bg" in cover ? cover.bg : ""}`}>
          {"photo" in cover ? (
            <img src={cover.photo} alt="" className="size-full max-w-none object-cover" />
          ) : (
            <img
              src={cover.art}
              alt=""
              className="absolute top-[-56.5px] left-0 h-[291px] w-full max-w-none"
            />
          )}
        </div>
        <div className="absolute inset-x-0 top-0 h-[178px] bg-[linear-gradient(180deg,rgba(22,24,31,0.08)_0%,rgba(22,24,31,0)_30%,rgba(22,24,31,0)_55%,rgba(22,24,31,0.62)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[178px] bg-[rgba(246,244,255,0.1)]" />
        <div className="absolute top-[14px] right-[14px] left-[14px] flex justify-between">
          <Badge variant="outline">{event.sport}</Badge>
          <Badge variant="secondary">
            <Icon name="icon-clock" className="size-[14px]" />
            {event.time}
          </Badge>
        </div>
        <div className="absolute top-[147px] left-4 flex items-center gap-[6px]">
          <Icon name="icon-pin1" className="size-4" />
          <span className="text-[13px] leading-[18px] font-semibold whitespace-nowrap text-white">
            {event.distance}
          </span>
        </div>
      </div>
      <div className="flex w-[388px] shrink-0 flex-col gap-3 px-[18px] pt-4 pb-[18px]">
        <div className="h-[46.5px]">
          <h3 className="-mt-px font-display text-[18px] leading-[22px] font-bold whitespace-nowrap text-foreground">
            {event.title}
          </h3>
          <p className="mt-[6px] text-sm leading-[19px] font-medium whitespace-nowrap text-muted-foreground">
            {event.place}
          </p>
        </div>
        <Participants people={event.people} going={event.going} total={event.total} />
      </div>
    </Card>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className={`box-border h-[74px] flex-1 rounded-[14px] border-2 border-ink px-[14px] pt-[10px] ${tone}`}>
      <p className="font-display text-[22px] leading-[27px] font-extrabold whitespace-nowrap text-foreground">
        {value}
      </p>
      <p className="mt-[2px] text-xs leading-[17px] font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

function FriendCard({ post }: { post: (typeof FRIENDS)[number] }) {
  const { media } = post;
  return (
    <Card className="h-[425px] overflow-hidden p-[22px]">
      <div className="flex h-[377px] flex-col gap-4">
        <div className="flex h-11 items-center gap-3">
          <Avatar className="size-11 after:hidden">
            <AvatarFallback className="border-2 border-ink bg-sky text-sm leading-[19px] font-extrabold tracking-[-0.5px] text-foreground">
              {post.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-[21px] font-extrabold text-foreground">{post.name}</p>
            <p className="text-[13px] leading-[18px] font-medium text-muted-foreground">{post.meta}</p>
          </div>
          <span className="text-xl leading-[27px] font-bold text-muted-foreground">···</span>
        </div>

        <h3 className="font-display text-xl leading-[25px] font-bold text-foreground">{post.title}</h3>

        <div className={`relative box-border h-[150px] shrink-0 overflow-hidden rounded-2xl border-2 border-ink ${media.bg}`}>
          <img
            src={media.art}
            alt=""
            className={`absolute top-0 left-0 h-[150px] max-w-none ${media.artWidth}`}
          />
          {media.record ? (
            <div className="absolute top-9 left-24 flex items-center gap-[14px]">
              <span className="flex size-[72px] items-center justify-center rounded-[36px] border-2 border-ink bg-card">
                <Icon name="icon-trophy" className="size-[34px]" />
              </span>
              <div>
                <Eyebrow>НОВЫЙ РЕКОРД</Eyebrow>
                <p className="mt-[2px] font-display text-[30px] leading-[37px] font-extrabold whitespace-nowrap text-foreground">
                  Присед 80 кг
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex h-[74px] gap-[10px]">
          {post.stats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>

        <div className="flex h-5 items-center gap-[18px] text-sm leading-[19px] font-bold text-foreground">
          <span className="flex items-center gap-[6px]">
            <Icon name={post.heartIcon} className="size-5" />
            {post.likes}
          </span>
          <span className="flex items-center gap-[6px]">
            <Icon name="icon-chat" className="size-5" />
            {post.comments}
          </span>
        </div>
      </div>
    </Card>
  );
}

export default function HomePage() {
  return (
    <>
    <HomeMobile />
    <div className="hidden min-h-dvh bg-background lg:block">
      <AppHeader current="home" />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 px-8 pt-8 pb-12">
        <Hero />
        <div className="mt-2">
          <Tip />
        </div>
        <Week />
        <SectionHeading title="Рядом с тобой" hint="3 события" linkLabel="Вся лента" />
        <div className="grid grid-cols-3 gap-5">
          {EVENTS.map((e) => (
            <EventCard key={e.title} event={e} />
          ))}
        </div>
        <SectionHeading title="Друзья тренируются" linkLabel="Все" />
        <div className="grid grid-cols-2 gap-5">
          {FRIENDS.map((f) => (
            <FriendCard key={f.title} post={f} />
          ))}
        </div>
      </main>
    </div>
    </>
  );
}
