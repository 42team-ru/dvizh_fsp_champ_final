import { useSearchParams } from "react-router";
import { usePetName } from "@/entity/user/model/use-pet-name";
import { MyBeaverBadge } from "@/widgets/beaver-pet/ui/my-beaver-badge";
import { SearchX } from "lucide-react";
import { useNavAccess } from "@/entity/user/model/use-nav-access";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { FeedMobile } from "./feed-mobile";
import { FeedPagination } from "./feed-pagination";
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

function BikeCard({ event, placeOf, className, onDismiss }: { event: EventSummaryResponse; placeOf?: (e: EventSummaryResponse) => string; className?: string; onDismiss?: (id: string) => void }) {
  const data = toCardData(event, SLOT_COVERS[6], placeOf?.(event));
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
  const petName = usePetName();
  return (
    <Card className={cn("relative min-h-[330px] justify-between overflow-hidden bg-secondary p-[26px]", className)}>
      <img
        src="/feed/memphis6.svg"
        alt=""
        className="absolute inset-0 size-full max-w-none object-cover object-left-top"
      />
      {/* бобр хозяина задумался «ну и где все?» (с его же инвентарём), над головой — облачко мысли с вопросом */}
      <div aria-hidden="true" className="pointer-events-none absolute right-4 bottom-2 h-[222px] w-[250px]">
        <MyBeaverBadge pose="think" className="size-full" />
        <span className="absolute top-[40px] left-[146px] size-[7px] rounded-full border-2 border-ink bg-card" />
        <span className="absolute top-[24px] left-[154px] size-3 rounded-full border-2 border-ink bg-card" />
        <span className="absolute -top-7 left-[160px] flex size-12 rotate-6 items-center justify-center rounded-full border-2 border-ink bg-card font-display text-[28px] leading-none font-extrabold text-primary shadow-hard-sm">
          ?
        </span>
      </div>
      <div className="relative">
        <div className="h-[64.5px]">
          <h2 className="w-[276px] font-display text-[28px] leading-8 font-extrabold text-foreground">
            Не нашёл
            <br />
            свою тусовку?
          </h2>
        </div>
        <p className="mt-[13px] w-[193px] text-[15px] leading-[22px] font-semibold text-foreground">
          Создай событие — {petName} расскажет о нём соседям с теми же интересами.
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
function Slot({ events, i, placeOf, reasonOf, topReasonOf, onDismiss, ...props }: {
  events: EventSummaryResponse[] | undefined;
  i: number;
  /** Расстояние до точки сбора вместо адреса. */
  placeOf?: (e: EventSummaryResponse) => string;
  /** У рекомендаций под названием — главная причина «почему вам это». */
  reasonOf?: (id: string) => string | undefined;
  /** Есть у лучших рекомендаций: причина выделяется фиолетовым со звёздочками. */
  topReasonOf?: (id: string) => string | undefined;
  /** Только в подборке «Для вас»: кнопка «Не интересно» на карточке. */
  onDismiss?: (id: string) => void;
} & Omit<React.ComponentProps<typeof EventCard>, "event" | "href" | "action">) {
  const event = events?.[i];
  if (!event) return null;
  const data = toCardData(event, SLOT_COVERS[i % SLOT_COVERS.length], placeOf?.(event));
  const reason = reasonOf?.(event.id);
  return <EventCard href={`/events/${event.id}`} event={reason ? { ...data, place: reason } : data}
    highlight={topReasonOf?.(event.id) != null} {...props}
    action={onDismiss ? <DismissButton onDismiss={() => onDismiss(event.id)} /> : undefined} />;
}

/** Карта понимает не все фильтры ленты: формат и «Для меня» ей не передаём (на карте только очные). */
/** Время на карте задаёт её собственный док, поэтому from/to ленты сюда не идут. */
const toMapFilters = ({ searchText, sportId, level, joinMode, organizationId }: EventsListParams): MapFilters =>
  ({ searchText, sportId, level, joinMode, organizationId });

export default function FeedPage() {
  const filters = useFeedFilters();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<"list" | "map">(() => searchParams.get("view") === "map" ? "map" : "list");
  const [more, setMore] = useState(false);
  const list = useFeedEvents(filters.params, filters);
  const { events, reasonOf, topReasonOf, placeOf } = list;
  const { dismiss } = useDismissRecommendation();
  const onDismiss = filters.forYou ? dismiss : undefined;
  return (
    <>
    <FeedMobile />
    <div className="relative isolate hidden min-h-dvh overflow-clip bg-background lg:block">
      <MemphisBackground seed="feed" />
      <AppHeader current="feed" />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-8 pt-8 pb-12">
        <FilterBar chip={filters.chip} onChip={filters.setChip} more={more} extraCount={filters.extraCount}
          onMore={() => setMore((m) => !m)} count={list.totalElements} view={view} onView={setView} />
        {more && <FeedExtraFilters value={filters.extra} onChange={filters.setExtra} className="w-full" />}
        {view === "map" ? (
          <EventsMap withHome filters={toMapFilters(filters.params)} className="h-[calc(100dvh-234px)] min-h-[640px] w-full" mapClassName="min-h-0" />
        ) : (
        <div className="flex min-w-[1216px] flex-col gap-5">
          {events?.length === 0 && <FeedEmpty />}
          {list.isError && !list.isFetchNextPageError && <p role="alert" className="text-lg font-semibold text-destructive">Не удалось загрузить ленту.</p>}
          {/* Ряды — отдельные сетки: если событий мало, пустеет конец ряда, а не съезжает раскладка. */}
          <div className="grid grid-cols-12 gap-5">
            <Slot placeOf={placeOf} reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} events={events} i={0} size="lg" className="col-span-6" />
            {/* В стопках обложки 2:1, чтобы ряд не вытягивал большую карточку и соседей в квадрат. */}
            <div className="col-span-3 flex flex-col gap-5">
              <Slot placeOf={placeOf} reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} events={events} i={1} coverClassName="aspect-[2/1]" className="grow" />
              <Slot placeOf={placeOf} reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} events={events} i={2} titleLines={2} coverClassName="aspect-[2/1]" className="grow" />
            </div>
            <div className="col-span-3 flex flex-col gap-5">
              <Slot placeOf={placeOf} reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} events={events} i={3} coverClassName="aspect-[2/1]" className="grow" />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-5">
            <Slot placeOf={placeOf} reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} events={events} i={4} className="col-span-4" />
            <Slot placeOf={placeOf} reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} events={events} i={5} className="col-span-4" />
            <Slot placeOf={placeOf} reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} events={events} i={6} className="col-span-4" />
          </div>
          {events?.[7] && (
            <div className="grid grid-cols-12 gap-5">
              <BikeCard event={events[7]} placeOf={placeOf} className="col-span-7" onDismiss={onDismiss} />
              <Slot events={events} i={8} placeOf={placeOf} reasonOf={reasonOf}
                topReasonOf={topReasonOf} onDismiss={onDismiss} className="col-span-5" />
            </div>
          )}
          <div className="grid grid-cols-3 gap-5">
            {events?.slice(9).map((event, index) => (
              <Slot key={event.id} events={events} i={index + 9} placeOf={placeOf}
                reasonOf={reasonOf} topReasonOf={topReasonOf} onDismiss={onDismiss} />
            ))}
          </div>
          <FeedPagination {...list} />
          {!list.isPending && !list.isError && !list.hasNextPage && <CtaCard className="w-full max-w-[560px] self-end" />}
        </div>
        )}
      </main>
    </div>
    </>
  );
}

/** Пустая лента: подсказать сменить фильтр или собрать свою встречу. */
function FeedEmpty() {
  const nav = useNavAccess();
  return (
    <EmptyState
      icon={SearchX}
      tone="bg-sky"
      title="Ничего не нашлось"
      text={nav.canCreate ? "Попробуйте другой фильтр — или соберите свою встречу, и люди подтянутся." : "Попробуйте другой фильтр или период."}
      action={nav.canCreate && (
        <Button asChild>
          <Link to="/events/new">Создать событие</Link>
        </Button>
      )}
    />
  );
}
