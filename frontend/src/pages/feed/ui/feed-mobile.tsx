import { FeedCityFilter } from "@/widgets/feed-filters/ui/feed-city-filter";
import { useSearchParams } from "react-router";
import { coverOf } from "@/entity/event/lib/cover";
import { usePetName } from "@/entity/user/model/use-pet-name";
import { SearchX } from "lucide-react";
import { useNavAccess } from "@/entity/user/model/use-nav-access";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { DismissButton, useDismissRecommendation } from "@/features/dismiss-recommendation/ui/dismiss-button";
import { MobileAppBar } from "@/widgets/mobile-shell/ui/mobile-app-bar";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Icon } from "@/shared/components/ui/icon";
import { Progress } from "@/shared/components/ui/progress";
import { cn } from "cn";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { EventSummaryResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { formatWhen } from "@/entity/event/lib/event-format";
import { FEED_CHIPS, FOR_YOU_CHIP, useFeedFilters } from "@/entity/event/model/use-feed-filters";
import { useFeedEvents } from "@/entity/event/model/use-feed-events";
import { Sparkles } from "lucide-react";
import { EventsMap } from "@/widgets/events-map/ui/events-map";
import { FeedExtraFilters } from "@/widgets/feed-filters/ui/feed-extra-filters";
import { FeedPagination } from "./feed-pagination";

const dir = "m-feed";

/** Оформление крупных карточек по порядку: фон и узор, высота обложки. */
const BIG_STYLES = [
  { photo: "bg-photo-lime", decor: "photo-decor.svg", height: 150, distTop: 111 },
  { photo: "bg-photo-mint", decor: "photo-decor1.svg", height: 130, distTop: 91 },
  { photo: "bg-photo-lilac", decor: "photo-decor2.svg", height: 120, distTop: 81 },
];
const SMALL_TONES = ["bg-photo-lilac", "bg-peach", "bg-sky", "bg-photo-mint"];

/** Сколько идут: у серии — отметки на ближайшее занятие, у разового — подтверждённые записи. */
const goingOf = (e: EventSummaryResponse) => e.occurrenceAttendeesCount ?? e.participantsCount;


const tag =
  "h-auto border-[1.5px] px-[10px] py-1 text-[10px] leading-[normal] font-extrabold tracking-[1px]";

/** Причина лучшей рекомендации: фиолетовым и со звёздочками, как на главной. */
function TopReason({ text, className }: { text: string; className?: string }) {
  return (
    <p className={cn("flex items-center gap-1 font-semibold text-primary", className)}>
      <Sparkles className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{text}</span>
    </p>
  );
}

function BigCard({ e, index, placeOf, reason, onDismiss }: {
  e: EventSummaryResponse;
  placeOf: (e: EventSummaryResponse) => string;
  index: number;
  /** Только у лучших рекомендаций «Для вас». */
  reason?: string;
  onDismiss?: (id: string) => void;
}) {
  const style = BIG_STYLES[index % BIG_STYLES.length];
  const going = goingOf(e);
  const total = e.capacity ?? undefined;
  const warn = total != null && going / total >= 0.8;
  return (
    <div className="px-4">
      <Card className="relative overflow-hidden rounded-[22px]">
        <Link to={`/events/${e.id}`} aria-label={e.title} className="absolute inset-0 z-10" />
        {onDismiss && <DismissButton onDismiss={() => onDismiss(e.id)} className="absolute top-12 right-3" />}
        <div className={cn("relative shrink-0 overflow-hidden", style.photo)} style={{ height: style.height }}>
          <img
            src={coverOf(e).src ?? `/${dir}/${style.decor}`}
            style={{ objectPosition: coverOf(e).position }}
            alt=""
            className="absolute top-0 left-0 size-full max-w-none object-cover"
          />
          {/* Справа время: длинный вид спорта обрезаем многоточием. */}
          <Badge variant="outline" title={e.sport.name} className={cn(tag, "absolute top-3 left-3 max-w-[calc(100%-150px)] bg-card")}>
            <span className="truncate">{e.sport.name.toUpperCase()}</span>
          </Badge>
          <span className="absolute top-3 right-3 rounded-pill bg-ink px-[10px] py-1 text-[11px] leading-[normal] font-extrabold tracking-[1px] whitespace-nowrap text-secondary">
            {formatWhen(e.startAt)}
          </span>
          <span
            className="absolute left-3 box-border flex max-w-[calc(100%-24px)] items-center gap-1 rounded-pill border-[1.5px] border-ink bg-card py-1 pr-[10px] pl-2"
            style={{ top: style.distTop }}
          >
            <Icon name={`${dir}/icon-pin`} className="size-[13px]" />
            <span className="truncate text-xs leading-[normal] font-bold text-foreground">{placeOf(e)}</span>
          </span>
        </div>
        <div className="flex flex-col gap-2 p-[14px]">
          <p className="font-display text-base leading-[21px] font-bold text-foreground">{e.title}</p>
          {reason && <TopReason text={reason} className="text-[13px] leading-[18px]" />}
          {e.scheduleDescription && <p className="text-[13px] leading-[18px] font-medium text-muted-foreground">{e.scheduleDescription}</p>}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[13px] leading-[normal] font-bold text-foreground">
              {total ? `Идут ${going} из ${total}` : `Идут ${going}`}
            </span>
            <span
              className={cn(
                "ml-auto text-xs leading-[normal] font-extrabold",
                warn ? "text-accent" : "text-muted-foreground"
              )}
            >
              {total ? `осталось ${Math.max(0, total - going)}` : "без лимита"}
            </span>
          </div>
          <Progress
            value={total ? (going / total) * 100 : 60}
            className="bg-card"
          />
        </div>
      </Card>
    </div>
  );
}

function SmallRow({ items, placeOf, reasonOf, onDismiss }: {
  items: EventSummaryResponse[];
  placeOf: (e: EventSummaryResponse) => string;
  /** Причина лучшей рекомендации вместо места. */
  reasonOf?: (id: string) => string | undefined;
  onDismiss?: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 px-4">
      {items.map((e, i) => {
        const going = goingOf(e);
        const s = {
          sport: e.sport.name.toUpperCase(), when: formatWhen(e.startAt), title: e.title, dist: placeOf(e),
          pct: e.capacity ? (going / e.capacity) * 100 : 25,
          left: e.capacity ? `осталось ${Math.max(0, e.capacity - going)}` : "без лимита",
          tone: SMALL_TONES[i % SMALL_TONES.length],
        };
        return (
        <Card key={e.id} className="relative overflow-hidden rounded-[20px]">
          <Link to={`/events/${e.id}`} aria-label={e.title} className="absolute inset-0 z-10" />
          {onDismiss && (
            <button type="button" aria-label="Не интересно — скрыть из подборки" title="Не интересно"
              onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); onDismiss(e.id); }}
              className="absolute top-2 right-2 z-20 flex size-7 items-center justify-center rounded-full border-2 border-ink bg-card text-xs font-extrabold">✕</button>
          )}
          <div className={cn("relative h-[84px] shrink-0 overflow-hidden", s.tone)}>
            <img
              src={`/${dir}/decor.svg`}
              alt=""
              className="absolute top-0 left-0 size-full max-w-none object-cover"
            />
            <Badge
              variant="outline"
              title={e.sport.name}
              className={cn(tag, "absolute top-[10px] left-[10px] max-w-[calc(100%-20px)] bg-card text-[9px]")}
            >
              <span className="truncate">{s.sport}</span>
            </Badge>
            <span className="absolute top-[52px] left-[10px] rounded-pill bg-ink px-[10px] py-1 text-[10px] leading-[normal] font-extrabold tracking-[1px] whitespace-nowrap text-secondary">
              {s.when}
            </span>
          </div>
          <div className="flex flex-col gap-[6px] p-3">
            {/* плитка в полэкрана: длинное слово («программированию») переносится с дефисом, а не обрезается */}
            <p className="font-display text-[13px] leading-[17px] font-bold hyphens-auto text-foreground">
              {s.title}
            </p>
            {reasonOf?.(e.id) ? (
              <TopReason text={reasonOf(e.id)!} className="text-xs leading-[normal] [&_svg]:size-[14px]" />
            ) : (
              <p className="truncate text-xs leading-[normal] font-medium text-muted-foreground">
                {s.dist}
              </p>
            )}
            <Progress value={s.pct} className="bg-card" />
            <p className="text-[11px] leading-[normal] font-extrabold whitespace-nowrap text-muted-foreground">
              {s.left}
            </p>
          </div>
        </Card>
        );
      })}
    </div>
  );
}

function Promo() {
  const petName = usePetName();
  return (
    <div className="px-4">
      <div className="box-border flex w-full flex-col gap-3 rounded-[24px] border-2 border-ink bg-secondary p-5 shadow-[4px_4px_0_var(--ink)]">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-[6px] font-bold text-foreground">
            <p className="font-display text-[17px] leading-[23px]">Не нашёл свою тусовку?</p>
            <p className="text-[13px] leading-[18px]">
              Создай событие — {petName} расскажет о нём соседям с теми же интересами.
            </p>
          </div>
          <img src={`/${dir}/img.png`} alt="" className="size-24 shrink-0 object-contain" />
        </div>
        <Button asChild variant="ink" className="h-[52px] w-full px-5">
          <Link to="/events/new">
            <Icon name={`${dir}/icon-plus`} className="size-[18px]" />
            Создать событие
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function FeedMobile() {
  const filters = useFeedFilters();
  const [search, setSearch] = useState("");
  const [searchText, setSearchText] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchText(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<"list" | "map">(() => searchParams.get("view") === "map" ? "map" : "list");
  const [more, setMore] = useState(false);
  const params = searchText ? { ...filters.params, searchText } : filters.params;
  const list = useFeedEvents(params, filters);
  const { dismiss } = useDismissRecommendation();
  const onDismiss = filters.forYou ? dismiss : undefined;
  const events = list.events ?? [];
  // Узор ленты: крупная карточка, затем пара мелких — и так по кругу.
  const groups: EventSummaryResponse[][] = [];
  for (let i = 0; i < events.length; i += 3) groups.push(events.slice(i, i + 3));
  return (
    <div className="relative isolate flex min-h-dvh overflow-clip flex-col gap-4 bg-background pb-[110px] lg:hidden">
      <MemphisBackground variant="mobile" seed="feed" />
      <MobileAppBar dir={dir} title="Лента" titleClassName="text-xl" />

      <div className="flex gap-[10px] px-4">
        <label className="box-border flex h-[52px] min-w-0 flex-1 items-center gap-[10px] rounded-2xl border-2 border-ink bg-card px-4">
          <Icon name={`${dir}/icon-search`} className="size-5" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Поиск событий"
            placeholder="Найти события"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <button
          type="button"
          aria-label="Фильтры"
          aria-expanded={more}
          onClick={() => setMore((m) => !m)}
          className={cn(
            "relative box-border flex size-[52px] shrink-0 items-center justify-center rounded-2xl border-2 border-ink shadow-hard-sm",
            more ? "bg-secondary" : "bg-primary",
          )}
        >
          {filters.extraCount > 0 && (
            <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border-2 border-ink bg-ink text-[11px] font-extrabold text-white">
              {filters.extraCount}
            </span>
          )}
          <Icon name={`${dir}/icon-filter`} className="size-[22px]" />
        </button>
      </div>

      {!filters.forYou && <div className="px-4"><FeedCityFilter city={filters.city} /></div>}

      {more && <FeedExtraFilters value={filters.extra} onChange={filters.setExtra} className="mx-4 p-4" />}

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
        {FEED_CHIPS.map((c) => (
          <Button
            key={c}
            variant={c === filters.chip ? (c === FOR_YOU_CHIP ? "default" : "ink") : c === FOR_YOU_CHIP ? "accent" : "soft"}
            aria-pressed={c === filters.chip}
            onClick={() => filters.setChip(c)}
            rough={false}
            className="h-11 shrink-0 px-[18px] text-sm shadow-none"
          >
            {c === FOR_YOU_CHIP && <Sparkles className="size-4" aria-hidden />}
            {c}
          </Button>
        ))}
      </div>

      <div className="px-4">
        <div
          role="tablist"
          className="box-border flex h-12 w-full items-center gap-1 rounded-pill border-2 border-ink bg-card p-1"
        >
          {(["list", "map"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={view === tab}
              onClick={() => setView(tab)}
              className={cn(
                "box-border h-[38px] min-w-0 flex-1 rounded-pill text-sm font-extrabold text-foreground",
                view === tab && "border-2 border-ink bg-secondary"
              )}
            >
              {tab === "list" ? "Список" : "Карта"}
            </button>
          ))}
        </div>
      </div>

      {view === "map" ? (
        <div className="px-4">
          <EventsMap key={filters.city.value} withHome filters={{ searchText: params.searchText, sportId: params.sportId, level: params.level, joinMode: params.joinMode, forMe: params.forMe, organizationId: params.organizationId, lat: params.lat, lon: params.lon, radiusKm: params.radiusKm }} preset={filters.chip === "Сегодня" ? "today" : filters.chip === "Выходные" ? "weekend" : undefined} className="w-full" mapClassName="h-[45dvh]" />
        </div>
      ) : (
        <>
          {list.totalElements !== undefined && (
            <p className="px-4 text-sm font-bold text-muted-foreground">Найдено событий: {list.totalElements}</p>
          )}
          {list.isError && !list.isFetchNextPageError && <p role="alert" className="px-4 text-base font-semibold text-destructive">Не удалось загрузить ленту.</p>}
          {!list.isPending && !list.isError && events.length === 0 && <FeedEmpty />}
          {/* «Не нашёл свою тусовку?» — после второй группы, а не в самом низу длинной ленты. */}
          {groups.map((group, i) => (
            <div key={group[0].id} className="flex flex-col gap-4">
              <BigCard e={group[0]} index={i} placeOf={list.placeOf} reason={list.topReasonOf(group[0].id)} onDismiss={onDismiss} />
              {group.length > 1 && <SmallRow items={group.slice(1)} placeOf={list.placeOf} reasonOf={list.topReasonOf} onDismiss={onDismiss} />}
              {i === 1 && <Promo />}
            </div>
          ))}
          <div className="px-4"><FeedPagination {...list} /></div>
          {groups.length < 2 && !list.isPending && !list.isError && !list.hasNextPage && <Promo />}
        </>
      )}
      <MobileTabBar current="feed" />
    </div>
  );
}

/** Пустая лента: подсказать сменить фильтр или собрать свою встречу. */
function FeedEmpty() {
  const nav = useNavAccess();
  return (
    <div className="px-4">
      <EmptyState
        icon={SearchX}
        bublik="think"
        tone="bg-sky"
        title="Ничего не нашлось"
        text="Попробуйте другой фильтр — или соберите свою встречу."
        action={nav.canCreate && (
          <Button asChild>
            <Link to="/events/new">Создать событие</Link>
          </Button>
        )}
      />
    </div>
  );
}
