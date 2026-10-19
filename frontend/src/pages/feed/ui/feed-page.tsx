import { FeedMobile } from "./feed-mobile";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import {
  EventCard,
  EventChips,
  EventCover,
  EventDistance,
  type EventCardData,
} from "@/widgets/event-card/ui/event-card";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Icon } from "@/shared/components/ui/icon";
import { Participants } from "@/shared/components/ui/participants";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";

const FILTERS = ["Все", "Сегодня", "Выходные", "Бег", "Игры", "Йога", "Шахматы"];

const ART = (n: string, className: string) => ({ src: `/feed/${n}.svg`, className });

const FOOTBALL: EventCardData = {
  sport: "Футбол",
  time: "Сегодня 19:30",
  distance: "3,2 км · Стадион «Локомотив»",
  title: "Вечерний футбол 6×6",
  place: "Стадион «Локомотив» · любители, 6 на 6, своя форма",
  people: ["ИВ", "АР", "ОТ"],
  going: 11,
  total: 14,
  cover: { bg: "bg-orange", art: ART("memphis", "top-[-3.5px] left-0 h-[445.5px] w-full") },
};

const CHESS: EventCardData = {
  sport: "Шахматы",
  time: "Сегодня 18:00",
  distance: "0,9 км от тебя",
  title: "Шахматы в парке",
  place: "Центральный парк · блиц 5+3",
  people: ["МС", "ТС"],
  going: 7,
  total: 10,
  cover: { bg: "bg-primary" },
};

const RUN: EventCardData = {
  sport: "Бег",
  time: "Сегодня 20:00",
  distance: "1,4 км",
  title: "Лёгкая пробежка у моста",
  place: "Набережная · новичкам",
  people: ["КЕ", "МС"],
  going: 5,
  cover: { photo: "/feed/box.png" },
};

const YOGA: EventCardData = {
  sport: "Йога",
  time: "Сегодня 20:30",
  distance: "2,1 км",
  title: "Вечерняя йога в зале",
  place: "Студия «Тихо» · любой уровень",
  people: ["ЛП", "ТС", "ОК"],
  going: 10,
  total: 12,
  tone: "warning",
  cover: { bg: "bg-sky", art: ART("memphis1", "top-[-18.5px] left-0 h-[291px] w-full") },
};

const STREETBALL: EventCardData = {
  sport: "Игры",
  time: "Сб 16:00",
  distance: "2,6 км от тебя",
  title: "Стритбол во дворе",
  place: "Площадка у школы №10 · 3 на 3",
  people: ["АР", "ИВ", "ОТ"],
  going: 8,
  total: 10,
  tone: "warning",
  cover: { bg: "bg-lavender-soft", art: ART("memphis2", "top-[-57px] left-0 h-[368.5px] w-full") },
};

const SWIM: EventCardData = {
  sport: "Плавание",
  time: "Вс 12:00",
  distance: "3,8 км",
  title: "Свободное плавание",
  place: "Бассейн «Радуга»",
  people: ["КЕ", "ЛП"],
  going: 6,
  cover: { bg: "bg-primary", art: ART("memphis3", "top-0 left-[-27px] h-[254.5px] w-[339px]") },
};

const TENNIS: EventCardData = {
  sport: "Теннис",
  time: "Сб 14:00",
  distance: "5,0 км",
  title: "Теннис на кортах",
  place: "Корты «Академия» · опытным",
  people: ["ТС", "РМ"],
  going: 3,
  total: 4,
  cover: { bg: "bg-mint", art: ART("memphis5", "top-[-14.5px] left-0 h-[214px] w-full") },
};

const NEARBY = [
  { initials: "МС", name: "Макс Сидоров", meta: "Бег, вело · 1,1 км", top: 56 },
  { initials: "КЕ", name: "Катя Егорова", meta: "Йога, плавание · 2,3 км", top: 110 },
];

function FilterBar() {
  return (
    <div className="relative h-[50px] w-[1216px] shrink-0">
      <h1 className="absolute top-0 left-0 font-display text-[40px] leading-[50px] font-extrabold tracking-[-1px] whitespace-nowrap text-foreground">
        Лента
      </h1>

      <div className="absolute top-[6px] left-[182px] flex gap-2">
        {FILTERS.map((label, i) => (
          <Button
            key={label}
            variant={i === 0 ? "ink" : "soft"}
            size="chip"
            className={i === 0 ? "hover:translate-x-0 hover:translate-y-0" : undefined}
          >
            {label}
          </Button>
        ))}
        <Button variant="soft" size="chip" className="border-dashed bg-transparent px-[14px]">
          <Icon name="feed/icon-filter" className="size-4" />
          Ещё
        </Button>
      </div>

      <span className="absolute top-[15.5px] left-[970px] text-sm leading-[19px] font-bold whitespace-nowrap text-muted-foreground">
        9 событий рядом
      </span>
      <Button
        variant="soft"
        className="absolute top-[5px] left-[1112px] h-10 px-[18px] text-sm leading-[19px]"
      >
        <Icon name="feed/icon-map" className="size-[18px]" />
        Карта
      </Button>
    </div>
  );
}

function NearbyPeople() {
  return (
    <Card className="absolute top-[410px] left-[927px] h-[190px] w-[289px] overflow-hidden">
      <div className="absolute top-5 left-5 flex h-[22px] w-[245px] items-center justify-between">
        <h2 className="font-display text-[17px] leading-[21px] font-bold text-foreground">
          Люди рядом
        </h2>
        <Icon name="feed/icon-users" className="size-[22px]" />
      </div>
      {NEARBY.map((p) => (
        <div
          key={p.initials}
          className="absolute left-5 flex h-10 w-[245px] items-center gap-3"
          style={{ top: p.top }}
        >
          <Avatar className="size-10 after:hidden">
            <AvatarFallback className="border-2 border-ink bg-sky text-[13px] leading-[18px] font-extrabold tracking-[-0.5px] text-foreground">
              {p.initials}
            </AvatarFallback>
          </Avatar>
          <div className="w-[147px]">
            <p className="text-sm leading-[19px] font-extrabold whitespace-nowrap text-foreground">
              {p.name}
            </p>
            <p className="text-xs leading-[17px] font-medium whitespace-nowrap text-muted-foreground">
              {p.meta}
            </p>
          </div>
          <Button
            variant="secondary"
            size="icon"
            aria-label={`Добавить: ${p.name}`}
            className="size-[34px] rounded-[17px] p-0 shadow-none"
          >
            <Icon name="feed/icon-plus1" className="size-4" />
          </Button>
        </div>
      ))}
    </Card>
  );
}

function BikeCard() {
  return (
    <Card className="absolute top-[1040px] left-0 h-[330px] w-[495px] flex-row items-start overflow-hidden p-[2px]">
      <div className="relative h-[326px] w-[226px] shrink-0 overflow-hidden border-r-2 border-ink">
        <div className="absolute inset-y-0 left-0 w-[224px]">
          <EventCover
            cover={{
              bg: "bg-secondary",
              art: ART("memphis4", "top-[79px] left-0 h-[168px] w-[224px]"),
            }}
            height={326}
          />
        </div>
        <EventChips sport="Вело" time="Вс 11:00" />
        <EventDistance top={295}>4,1 км от тебя</EventDistance>
      </div>
      <div className="flex h-[326px] w-[265px] shrink-0 flex-col justify-between px-[18px] pt-4 pb-[18px]">
        <div>
          <h3 className="-mt-px w-[229px] font-display text-[18px] leading-[21.5px] font-bold text-foreground">
            Вело до Удачного и обратно
          </h3>
          <p className="mt-[7px] w-[210.5px] text-sm leading-[19px] font-medium text-muted-foreground">
            Удачный · 34 км, средний темп, остановка на кофе
          </p>
        </div>
        <Participants people={["ДК", "ТС", "РМ"]} going={12} />
      </div>
    </Card>
  );
}

function CtaCard() {
  return (
    <Card className="absolute top-[1040px] left-[824px] h-[330px] w-[392px] justify-between overflow-hidden bg-secondary p-[26px]">
      <img
        src="/feed/memphis6.svg"
        alt=""
        className="absolute top-0 left-0 h-[380px] w-[400px] max-w-none"
      />
      <img
        src="/feed/ask.png"
        alt=""
        className="pointer-events-none absolute top-[92px] left-[233px] h-[150px] w-[145px] max-w-none object-cover"
      />
      <div className="relative w-[340px]">
        <div className="h-[64.5px]">
          <h2 className="w-[276px] font-display text-[28px] leading-8 font-extrabold text-foreground">
            Не нашёл
            <br />
            свою тусовку?
          </h2>
        </div>
        <p className="mt-[13px] w-[193px] text-[15px] leading-[22px] font-semibold text-foreground">
          Создай событие — Бублик расскажет о нём соседям с теми же интересами.
        </p>
      </div>
      <div className="relative">
        <Button variant="ink" size="lg">
          <Icon name="feed/icon-plus" className="size-[18px]" />
          Создать событие
        </Button>
      </div>
    </Card>
  );
}

export default function FeedPage() {
  return (
    <>
    <FeedMobile />
    <div className="relative isolate hidden min-h-dvh overflow-clip bg-background lg:block">
      <MemphisBackground seed="feed" />
      <AppHeader current="feed" />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 px-8 pt-8 pb-12">
        <FilterBar />
        <div className="relative h-[1370px] w-[1216px] shrink-0">
          <EventCard
            event={FOOTBALL}
            size="lg"
            coverHeight={441}
            distanceTop={405}
            className="top-0 left-0 h-[600px] w-[598px]"
          />
          <EventCard
            event={CHESS}
            coverHeight={456.5}
            distanceTop={423.5}
            className="top-0 left-[618px] h-[600px] w-[289px]"
          />
          <EventCard
            event={RUN}
            titleLines={2}
            coverHeight={225}
            distanceTop={192}
            className="top-0 left-[927px] h-[390px] w-[289px]"
          />
          <NearbyPeople />
          <EventCard
            event={YOGA}
            coverHeight={256.5}
            distanceTop={223.5}
            className="top-[620px] left-0 h-[400px] w-[392px]"
          />
          <EventCard
            event={STREETBALL}
            coverHeight={256.5}
            distanceTop={223.5}
            className="top-[620px] left-[412px] h-[400px] w-[495px]"
          />
          <EventCard
            event={SWIM}
            coverHeight={256.5}
            distanceTop={223.5}
            className="top-[620px] left-[927px] h-[400px] w-[289px]"
          />
          <BikeCard />
          <EventCard
            event={TENNIS}
            coverHeight={186.5}
            distanceTop={153.5}
            className="top-[1040px] left-[515px] h-[330px] w-[289px]"
          />
          <CtaCard />
        </div>
      </main>
    </div>
    </>
  );
}
