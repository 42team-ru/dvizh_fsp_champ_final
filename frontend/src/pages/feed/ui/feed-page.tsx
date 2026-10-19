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
import { Link } from "react-router";
import { useState } from "react";
import { useEventsList } from "@/shared/api/generated/core/events/events";
import type { EventSummaryResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { toCardData, formatWhen } from "@/entity/event/lib/event-format";
import { FEED_CHIPS, useFeedFilters, type FeedChip } from "@/entity/event/model/use-feed-filters";
import { EventsMap } from "@/widgets/events-map/ui/events-map";

const ART = (n: string, className: string) => ({ src: `/feed/${n}.svg`, className });

/** Оформление слотов сетки по Figma: обложка, если у события нет своего фото. */
const SLOT_COVERS: EventCardData["cover"][] = [
  { bg: "bg-orange", art: ART("memphis", "top-[-3.5px] left-0 h-[445.5px] w-full") },
  { bg: "bg-primary" },
  { bg: "bg-lime-soft", art: ART("memphis2", "top-[-57px] left-0 h-[368.5px] w-full") },
  { bg: "bg-sky", art: ART("memphis1", "top-[-18.5px] left-0 h-[291px] w-full") },
  { bg: "bg-lavender-soft", art: ART("memphis2", "top-[-57px] left-0 h-[368.5px] w-full") },
  { bg: "bg-primary", art: ART("memphis3", "top-0 left-[-27px] h-[254.5px] w-[339px]") },
  { bg: "bg-secondary", art: ART("memphis4", "top-[79px] left-0 h-[168px] w-[224px]") },
  { bg: "bg-mint", art: ART("memphis5", "top-[-14.5px] left-0 h-[214px] w-full") },
];

const NEARBY = [
  { initials: "МС", name: "Макс Сидоров", meta: "Бег, вело · 1,1 км", top: 56 },
  { initials: "КЕ", name: "Катя Егорова", meta: "Йога, плавание · 2,3 км", top: 110 },
];

function FilterBar({ chip, onChip, count, view, onView }: {
  chip: FeedChip;
  onChip(chip: FeedChip): void;
  count: number | undefined;
  view: "list" | "map";
  onView(view: "list" | "map"): void;
}) {
  return (
    <div className="relative h-[50px] w-[1216px] shrink-0">
      <h1 className="absolute top-0 left-0 font-display text-[40px] leading-[50px] font-extrabold tracking-[-1px] whitespace-nowrap text-foreground">
        Лента
      </h1>

      <div className="absolute top-[6px] left-[182px] flex gap-2">
        {FEED_CHIPS.map((label) => (
          <Button
            key={label}
            variant={label === chip ? "ink" : "soft"}
            size="chip"
            aria-pressed={label === chip}
            onClick={() => onChip(label)}
            className={label === chip ? "hover:translate-x-0 hover:translate-y-0" : undefined}
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
        {count === undefined ? "Загружаем…" : `${count} ${count % 10 === 1 && count % 100 !== 11 ? "событие" : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? "события" : "событий"}`}
      </span>
      <Button
        variant={view === "map" ? "ink" : "soft"}
        aria-pressed={view === "map"}
        onClick={() => onView(view === "map" ? "list" : "map")}
        className="absolute top-[5px] left-[1112px] h-10 px-[18px] text-sm leading-[19px]"
      >
        <Icon name="feed/icon-map" className="size-[18px]" />
        {view === "map" ? "Лента" : "Карта"}
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

function BikeCard({ event }: { event: EventSummaryResponse }) {
  const data = toCardData(event, SLOT_COVERS[6]);
  return (
    <Card className="absolute top-[1040px] left-0 h-[330px] w-[495px] flex-row items-start overflow-hidden p-[2px]">
      <Link to={`/events/${event.id}`} aria-label={event.title} className="absolute inset-0 z-10" />
      <div className="relative h-[326px] w-[226px] shrink-0 overflow-hidden border-r-2 border-ink">
        <div className="absolute inset-y-0 left-0 w-[224px]">
          <EventCover cover={data.cover} height={326} />
        </div>
        <EventChips sport={data.sport} time={formatWhen(event.startAt)} />
        <EventDistance top={295}>{data.distance}</EventDistance>
      </div>
      <div className="flex h-[326px] w-[265px] shrink-0 flex-col justify-between px-[18px] pt-4 pb-[18px]">
        <div>
          <h3 className="-mt-px w-[229px] font-display text-[18px] leading-[21.5px] font-bold text-foreground">
            {data.title}
          </h3>
          <p className="mt-[7px] w-[210.5px] text-sm leading-[19px] font-medium text-muted-foreground">
            {data.place}
          </p>
        </div>
        <Participants people={data.people} going={data.going} total={data.total} tone={data.tone} />
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
        <Button asChild variant="ink" size="lg">
          <Link to="/events/new">
            <Icon name="feed/icon-plus" className="size-[18px]" />
            Создать событие
          </Link>
        </Button>
      </div>
    </Card>
  );
}

/** Слоты сетки по Figma: размеры карточек и обложек. Мероприятия раскладываются по порядку. */
const SLOTS: { size?: "lg"; titleLines?: 2; coverHeight: number; distanceTop: number; className: string }[] = [
  { size: "lg", coverHeight: 441, distanceTop: 405, className: "top-0 left-0 h-[600px] w-[598px]" },
  { coverHeight: 456.5, distanceTop: 423.5, className: "top-0 left-[618px] h-[600px] w-[289px]" },
  { titleLines: 2, coverHeight: 225, distanceTop: 192, className: "top-0 left-[927px] h-[390px] w-[289px]" },
  { coverHeight: 256.5, distanceTop: 223.5, className: "top-[620px] left-0 h-[400px] w-[392px]" },
  { coverHeight: 256.5, distanceTop: 223.5, className: "top-[620px] left-[412px] h-[400px] w-[495px]" },
  { coverHeight: 256.5, distanceTop: 223.5, className: "top-[620px] left-[927px] h-[400px] w-[289px]" },
];

export default function FeedPage() {
  const filters = useFeedFilters();
  const [view, setView] = useState<"list" | "map">("list");
  const list = useEventsList(filters.params, { query: { enabled: filters.ready } });
  const events = list.data?.status === 200 ? list.data.data : undefined;
  return (
    <>
    <FeedMobile />
    <div className="relative isolate hidden min-h-dvh overflow-clip bg-background lg:block">
      <MemphisBackground seed="feed" />
      <AppHeader current="feed" />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 px-8 pt-8 pb-12">
        <FilterBar chip={filters.chip} onChip={filters.setChip} count={events?.length} view={view} onView={setView} />
        {view === "map" ? (
          <EventsMap filters={filters.params} className="w-[1216px]" mapClassName="h-[680px]" />
        ) : (
        <div className="relative h-[1370px] w-[1216px] shrink-0">
          {events?.length === 0 && (
            <p className="absolute top-0 left-0 text-lg font-semibold text-muted-foreground">
              Ничего не нашлось — попробуйте другой фильтр или создайте своё событие.
            </p>
          )}
          {list.isError && <p role="alert" className="absolute top-0 left-0 text-lg font-semibold text-destructive">Не удалось загрузить ленту.</p>}
          {SLOTS.map((slot, i) => events?.[i] && (
            <EventCard
              key={events[i].id}
              href={`/events/${events[i].id}`}
              event={toCardData(events[i], SLOT_COVERS[i])}
              size={slot.size}
              titleLines={slot.titleLines}
              coverHeight={slot.coverHeight}
              distanceTop={slot.distanceTop}
              className={slot.className}
            />
          ))}
          <NearbyPeople />
          {events?.[6] && <BikeCard event={events[6]} />}
          {events?.[7] && (
            <EventCard
              href={`/events/${events[7].id}`}
              event={toCardData(events[7], SLOT_COVERS[7])}
              coverHeight={186.5}
              distanceTop={153.5}
              className="top-[1040px] left-[515px] h-[330px] w-[289px]"
            />
          )}
          <CtaCard />
        </div>
        )}
      </main>
    </div>
    </>
  );
}
