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
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { Link } from "react-router";
import { cn } from "cn";
import { useState } from "react";
import type { EventSummaryResponse, EventsListParams } from "@/shared/api/generated/core/appAPI.schemas";
import { toCardData, formatWhen } from "@/entity/event/lib/event-format";
import { FEED_CHIPS, FOR_YOU_CHIP, useFeedFilters, type FeedChip } from "@/entity/event/model/use-feed-filters";
import { useFeedEvents } from "@/entity/event/model/use-feed-events";
import { DismissButton, useDismissRecommendation } from "@/features/dismiss-recommendation/ui/dismiss-button";
import { EventsMap, type MapFilters } from "@/widgets/events-map/ui/events-map";
import { FeedExtraFilters } from "@/widgets/feed-filters/ui/feed-extra-filters";
import { LayoutGrid, Map as MapIcon, Sparkles } from "lucide-react";

/** Узор заполняет обложку любого размера: карточки тянутся вместе с сеткой. */
const ART = (n: string) => ({ src: `/feed/${n}.svg`, className: "inset-0 size-full object-cover" });

/** Оформление слотов сетки по Figma: обложка, если у события нет своего фото. */
const SLOT_COVERS: EventCardData["cover"][] = [
  { bg: "bg-orange", art: ART("memphis") },
  { bg: "bg-primary" },
  { bg: "bg-lime-soft", art: ART("memphis2") },
  { bg: "bg-sky", art: ART("memphis1") },
  { bg: "bg-lavender-soft", art: ART("memphis2") },
  { bg: "bg-primary", art: ART("memphis3") },
  { bg: "bg-secondary", art: ART("memphis4") },
  { bg: "bg-mint", art: ART("memphis5") },
];


function FilterBar({ chip, onChip, more, extraCount, onMore, count, view, onView }: {
  chip: FeedChip;
  onChip(chip: FeedChip): void;
  more: boolean;
  extraCount: number;
  onMore(): void;
  count: number | undefined;
  view: "list" | "map";
  onView(view: "list" | "map"): void;
}) {
  return (
    <div className="flex h-[50px] w-full min-w-[1216px] shrink-0 items-center gap-8">
      <h1 className="font-display text-[40px] leading-[50px] font-extrabold tracking-[-1px] whitespace-nowrap text-foreground">
        Лента
      </h1>

      <div className="flex gap-2">
        {FEED_CHIPS.map((label) => (
          <Button
            key={label}
            variant={label === chip ? (label === FOR_YOU_CHIP ? "default" : "ink") : label === FOR_YOU_CHIP ? "accent" : "soft"}
            size="chip"
            aria-pressed={label === chip}
            onClick={() => onChip(label)}
            className={label === chip ? "hover:translate-x-0 hover:translate-y-0" : undefined}
          >
            {label === FOR_YOU_CHIP && <Sparkles className="size-4" aria-hidden />}
            {label}
          </Button>
        ))}
        <Button variant={more || extraCount > 0 ? "ink" : "soft"} size="chip" aria-expanded={more} onClick={onMore}
          className={cn("px-[14px]", !more && extraCount === 0 && "border-dashed bg-transparent")}>
          <Icon name="feed/icon-filter" className={cn("size-4", (more || extraCount > 0) && "invert")} />
          Ещё{extraCount > 0 && ` · ${extraCount}`}
        </Button>
      </div>

      <span className="ml-auto text-sm leading-[19px] font-bold whitespace-nowrap text-muted-foreground">
        {count === undefined ? "Загружаем…" : `${count} ${count % 10 === 1 && count % 100 !== 11 ? "событие" : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? "события" : "событий"}`}
      </span>
      <Button
        variant={view === "map" ? "ink" : "soft"}
        aria-pressed={view === "map"}
        onClick={() => onView(view === "map" ? "list" : "map")}
        className="-ml-2 h-10 w-[112px] gap-2 px-4 text-sm leading-[19px]"
      >
        {view === "map" ? <LayoutGrid className="size-[18px]" /> : <MapIcon className="size-[18px]" />}
        {view === "map" ? "Лента" : "Карта"}
      </Button>
    </div>
  );
}

function BikeCard({ event, className, onDismiss }: { event: EventSummaryResponse; className?: string; onDismiss?: (id: string) => void }) {
  const data = toCardData(event, SLOT_COVERS[6]);
  return (
    <Card className={cn("relative min-h-[330px] flex-row overflow-hidden p-0", className)}>
      <Link to={`/events/${event.id}`} aria-label={event.title} className="absolute inset-0 z-10" />
      {onDismiss && <DismissButton onDismiss={() => onDismiss(event.id)} className="absolute top-3 right-3" />}
      <div className="relative w-1/2 shrink-0 overflow-hidden border-r-2 border-ink">
        <EventCover cover={data.cover} />
        <EventChips sport={data.sport} time={formatWhen(event.startAt)} />
        <EventDistance>{data.distance}</EventDistance>
      </div>
      {/* Кнопка «Не интересно» висит над колонкой текста: в подборке текст начинается под ней (12 + 32 + 12px). */}
      <div className={cn("flex min-w-0 flex-1 flex-col justify-between px-[18px] pb-[18px]", onDismiss ? "pt-14" : "pt-4")}>
        <div>
          <h3 className="-mt-px line-clamp-3 font-display text-[18px] leading-[21.5px] font-bold text-foreground">
            {data.title}
          </h3>
          <p className="mt-[7px] text-sm leading-[19px] font-medium text-muted-foreground">
            {data.place}
          </p>
        </div>
        <Participants people={data.people} going={data.going} total={data.total} tone={data.tone} />
      </div>
    </Card>
  );
}

function CtaCard({ className }: { className?: string }) {
  return (
    <Card className={cn("relative min-h-[330px] justify-between overflow-hidden bg-secondary p-[26px]", className)}>
      <img
        src="/feed/memphis6.svg"
        alt=""
        className="absolute inset-0 size-full max-w-none object-cover object-left-top"
      />
      <img
        src="/feed/ask.png"
        alt=""
        className="pointer-events-none absolute top-[92px] right-[14px] h-[150px] w-[145px] max-w-none object-cover"
      />
      <div className="relative">
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

/** Карточка события из ленты по индексу; обложка-заглушка — по тому же слоту. */
function Slot({ events, i, reasonOf, topReasonOf, onDismiss, ...props }: {
  events: EventSummaryResponse[] | undefined;
  i: number;
  /** У рекомендаций под названием — главная причина «почему вам это». */
  reasonOf?: (id: string) => string | undefined;
  /** Есть у лучших рекомендаций: причина выделяется фиолетовым со звёздочками. */
  topReasonOf?: (id: string) => string | undefined;
  /** Только в подборке «Для вас»: кнопка «Не интересно» на карточке. */
  onDismiss?: (id: string) => void;
} & Omit<React.ComponentProps<typeof EventCard>, "event" | "href" | "action">) {
  const event = events?.[i];
  if (!event) return null;
  const data = toCardData(event, SLOT_COVERS[i % SLOT_COVERS.length]);
  const reason = reasonOf?.(event.id);
  return <EventCard href={`/events/${event.id}`} event={reason ? { ...data, place: reason } : data}
    highlight={topReasonOf?.(event.id) != null} {...props}
    action={onDismiss ? <DismissButton onDismiss={() => onDismiss(event.id)} /> : undefined} />;
}

/** Карта понимает не все фильтры ленты: формат и «Для меня» ей не передаём (на карте только очные). */
/** Время на карте задаёт её собственный док, поэтому from/to ленты сюда не идут. */
const toMapFilters = ({ searchText, sportId, level, joinMode }: EventsListParams): MapFilters =>
  ({ searchText, sportId, level, joinMode });

export default function FeedPage() {
  const filters = useFeedFilters();
  const [view, setView] = useState<"list" | "map">("list");
  const [more, setMore] = useState(false);
  const list = useFeedEvents(filters.params, filters);
  const { events, reasonOf, topReasonOf } = list;
  const { dismiss } = useDismissRecommendation();
  const onDismiss = filters.forYou ? dismiss : undefined;
  return (
    <>
    <FeedMobile />
    <div className="relative isolate hidden min-h-dvh overflow-clip bg-background lg:block">
      <MemphisBackground seed="feed" />
      <AppHeader current="feed" wide />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-8 pt-8 pb-12">
        <FilterBar chip={filters.chip} onChip={filters.setChip} more={more} extraCount={filters.extraCount}
          onMore={() => setMore((m) => !m)} count={events?.length} view={view} onView={setView} />
        {more && <FeedExtraFilters value={filters.extra} onChange={filters.setExtra} className="w-full" />}
        {view === "map" ? (
          <EventsMap filters={toMapFilters(filters.params)} className="w-full" mapClassName="h-[436px]" />
        ) : (
        <div className="flex min-w-[1216px] flex-col gap-5">
          {events?.length === 0 && (
            <p className="text-lg font-semibold text-muted-foreground">
              Ничего не нашлось — попробуйте другой фильтр или создайте своё событие.
            </p>
          )}
          {list.isError && <p role="alert" className="text-lg font-semibold text-destructive">Не удалось загрузить ленту.</p>}
          {/* Ряды — отдельные сетки: если событий мало, пустеет конец ряда, а не съезжает раскладка. */}
          <div className="grid grid-cols-12 gap-5">
            <Slot reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} events={events} i={0} size="lg" className="col-span-6" />
            {/* В стопках обложки 2:1, чтобы ряд не вытягивал большую карточку и соседей в квадрат. */}
            <div className="col-span-3 flex flex-col gap-5">
              <Slot reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} events={events} i={1} coverClassName="aspect-[2/1]" className="grow" />
              <Slot reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} events={events} i={2} titleLines={2} coverClassName="aspect-[2/1]" className="grow" />
            </div>
            <div className="col-span-3 flex flex-col gap-5">
              <Slot reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} events={events} i={3} coverClassName="aspect-[2/1]" className="grow" />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-5">
            <Slot reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} events={events} i={4} className="col-span-4" />
            <Slot reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} events={events} i={5} className="col-span-4" />
            <Slot reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} events={events} i={6} className="col-span-4" />
          </div>
          <div className="grid grid-cols-12 gap-5">
            {events?.[7] && <BikeCard event={events[7]} className="col-span-7" onDismiss={onDismiss} />}
            <CtaCard className="col-span-5 col-start-8" />
          </div>
        </div>
        )}
      </main>
    </div>
    </>
  );
}
