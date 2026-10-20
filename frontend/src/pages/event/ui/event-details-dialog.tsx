import { useRef, useState, type ReactNode } from "react";
import { Linkified } from "@/shared/lib/linkify";
import { CalendarPlus, Check, ChevronDown, Clock, Copy, DoorOpen, ExternalLink, Info, Lock, LockOpen, MapPin, Navigation, Repeat, Route, UserCheck, Users, Video, X } from "lucide-react";
import { cn } from "cn";
import type { EventResponse, OccurrenceResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { AddToCalendarButton } from "@/features/add-to-calendar/ui/add-to-calendar-button";
import { calendarEventOf } from "@/features/add-to-calendar/lib/calendar-links";
import { useOccurrencesList } from "@/shared/api/generated/core/occurrences/occurrences";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { EVENT_LEVEL_LABEL, JOIN_MODE_LABEL, OCCURRENCE_BADGE } from "@/shared/lib/statuses";
import { plural } from "@/shared/lib/plural";
import { toast } from "@/shared/lib/toast";
import { LocationPicker } from "@/widgets/events-map/ui/location-picker";
import { placeName, privateNote } from "../model/use-event";
import { RouteButton, dgisPlace } from "@/features/route-button/ui/route-button";

export type EventDetailsSection = "when" | "where" | "registration";

/** Сколько занятий серии видно до «Показать все». */
const PREVIEW = 5;
/** Больше мест — вместо квадратиков полоса. */
const MAX_SEATS = 24;

/** Даты и время в часовом поясе встречи (у разовой — в поясе браузера). */
function dates(timeZone?: string) {
  const f = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString("ru-RU", { ...o, timeZone });
  const day = (iso: string | Date) => Date.parse(new Date(iso).toLocaleDateString("en-CA", { timeZone }));
  return {
    weekday: (iso: string) => f(iso, { weekday: "short" }).replace(".", "").toUpperCase(),
    dayNumber: (iso: string) => f(iso, { day: "numeric" }),
    month: (iso: string) => f(iso, { day: "numeric", month: "long" }).split(" ")[1],
    short: (iso: string) => f(iso, { day: "numeric", month: "short" }).replace(".", ""),
    time: (iso: string) => f(iso, { hour: "2-digit", minute: "2-digit" }),
    full: (iso: string) => f(iso, { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }),
    /** «Красноярск, GMT+7» вместо идентификатора Asia/Krasnoyarsk. */
    zone: () => ["shortGeneric", "shortOffset"].map((timeZoneName) => new Intl.DateTimeFormat("ru-RU", { timeZone, timeZoneName } as Intl.DateTimeFormatOptions)
      .formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value).filter(Boolean).join(", "),
    date: (isoDate: string) => new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" }),
    /** Календарные дни, а не сутки: встреча завтра в 19:00 — «завтра». */
    relative: (iso: string) => {
      const days = Math.round((day(iso) - day(new Date())) / 86_400_000);
      return days < 0 ? undefined : days === 0 ? "сегодня" : days === 1 ? "завтра" : `через ${days} ${plural(days, ["день", "дня", "дней"])}`;
    },
  };
}

function duration(from: string, to?: string) {
  if (!to) return undefined;
  const minutes = Math.round((Date.parse(to) - Date.parse(from)) / 60_000);
  return [minutes >= 60 && `${Math.floor(minutes / 60)} ч`, minutes % 60 && `${minutes % 60} мин`].filter(Boolean).join(" ");
}

function Chip({ className, icon, children }: { className?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-pill border-2 border-ink bg-card px-2.5 py-0.5 text-[13px] leading-5 font-extrabold [&_svg]:size-3.5 [&_svg]:stroke-[2.5]", className)}>
      {icon}{children}
    </span>
  );
}

function IconCircle({ className, children }: { className?: string; children: ReactNode }) {
  return <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-card [&_svg]:size-5", className)}>{children}</span>;
}

/** Карточка-пояснение: иконка в круге, надзаголовок и текст. */
function Note({ className, icon, iconClassName, eyebrow, eyebrowClassName, children }: {
  className?: string; icon: ReactNode; iconClassName?: string; eyebrow?: string; eyebrowClassName?: string; children: ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-3.5 rounded-2xl border-2 border-ink p-4", className)}>
      <IconCircle className={iconClassName}>{icon}</IconCircle>
      <div className="min-w-0 flex-1 space-y-1">
        {eyebrow && <Eyebrow className={eyebrowClassName}>{eyebrow}</Eyebrow>}
        <div className="text-base leading-[22px] font-bold break-words whitespace-pre-wrap">{children}</div>
      </div>
    </div>
  );
}

/**
 * Полные данные билета; мобильная (шторка снизу) и настольная (окно по центру) версии — одно окно.
 * `action` — кнопка записи страницы события, чтобы после чтения деталей не закрывать окно.
 */
export function EventDetailsDialog({ event: e, section, action, onClose, onRestoreFocus }: {
  event: EventResponse;
  section?: EventDetailsSection;
  action?: ReactNode;
  onClose: () => void;
  onRestoreFocus: () => void;
}) {
  const open = section !== undefined;
  const scroll = useRef<HTMLDivElement>(null);
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent showCloseButton={false} onCloseAutoFocus={(event) => { event.preventDefault(); onRestoreFocus(); }}
        className={cn(
          "flex max-w-none flex-col gap-0 overflow-hidden border-[2.5px] border-ink bg-card p-0 text-base text-foreground shadow-hard",
          // мобильный: шторка снизу почти на весь экран
          "top-auto bottom-0 h-[94dvh] translate-y-0 rounded-t-[24px] rounded-b-none data-open:slide-in-from-bottom-10 data-open:zoom-in-100",
          "sm:top-1/2 sm:bottom-auto sm:h-[min(860px,90dvh)] sm:max-w-[640px] sm:-translate-y-1/2 sm:rounded-[24px] sm:shadow-[8px_8px_0_var(--ink)] sm:data-open:slide-in-from-bottom-0 sm:data-open:zoom-in-95",
        )}>
        <div aria-hidden className="mx-auto mt-2.5 h-[5px] w-11 shrink-0 rounded-full bg-ink sm:hidden" />
        {open && <Tabs key={section} defaultValue={section} onValueChange={() => scroll.current?.scrollTo({ top: 0 })} className="min-h-0 flex-1 gap-0">
          <div className="shrink-0 space-y-4 px-[18px] pt-2 pb-4 sm:space-y-[18px] sm:px-7 sm:pt-6 sm:pb-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                <Eyebrow className="text-primary">Подробнее о встрече</Eyebrow>
                <DialogTitle className="font-display text-lg leading-[23px] font-extrabold break-words sm:text-[22px] sm:leading-7">{e.title}</DialogTitle>
                <DialogDescription className="sr-only">Когда и где проходит встреча, как на неё записаться</DialogDescription>
                <div className="flex flex-wrap gap-1.5">
                  <Chip className="bg-sky">{e.sport.name}</Chip>
                  <Chip>{EVENT_LEVEL_LABEL[e.level]}</Chip>
                  <Chip className={e.recurring ? "bg-lime" : "bg-peach"}>{e.recurring ? "Серия" : "Разовая"}</Chip>
                  {e.format === "ONLINE" && <Chip className="bg-lavender-soft">Онлайн</Chip>}
                </div>
              </div>
              <DialogClose asChild>
                <Button variant="soft" size="icon" rough={false} aria-label="Закрыть" className="rounded-full [&_svg:not([class*='size-'])]:size-5"><X /></Button>
              </DialogClose>
            </div>
            <TabsList aria-label="Подробности встречи" className="w-full gap-0.5 bg-lavender">
              {([["when", "Когда", Clock], ["where", "Где", MapPin], ["registration", "Запись", Route]] as const).map(([value, label, TabIcon]) => (
                <TabsTrigger key={value} value={value}
                  className="h-11 flex-1 px-2 text-[15px] text-foreground data-[state=active]:border-transparent data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:[&_svg]:text-lime">
                  <TabIcon className="stroke-[2.2]" />{label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div ref={scroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[18px] pt-1 pb-5 sm:px-7 sm:pb-7">
            <TabsContent value="when"><WhenTab e={e} /></TabsContent>
            <TabsContent value="where"><WhereTab e={e} /></TabsContent>
            <TabsContent value="registration"><RegistrationTab e={e} /></TabsContent>
          </div>
        </Tabs>}
        {/* «Корешок» билета: пунктир — линия отрыва, внутри главное действие. */}
        <div className="flex shrink-0 items-center gap-2.5 border-t-2 border-dashed border-ink bg-lime-soft px-[18px] pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:gap-3 sm:px-7 sm:pt-[18px] sm:pb-5">
          {e.status === "PUBLISHED" && e.singleOccurrence?.status !== "CANCELLED" && (!e.recurring || e.nextOccurrence) && (
            <AddToCalendarButton variant="soft" className="shadow-hard-sm max-sm:size-11 max-sm:px-0"
              event={calendarEventOf(e, e.nextOccurrence?.startAt ?? e.startAt, e.nextOccurrence ? e.nextOccurrence.endAt : e.endAt)}>
              <CalendarPlus className="size-[18px]" /><span className="max-sm:sr-only">В календарь</span>
            </AddToCalendarButton>
          )}
          {action && <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-3 [&>button]:max-sm:flex-1 [&>p]:max-sm:hidden">{action}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WhenTab({ e }: { e: EventResponse }) {
  const d = dates(e.schedule?.timeZone);
  const [all, setAll] = useState(false);
  const list = useOccurrencesList(e.id, undefined, { query: { enabled: e.recurring } });
  const occurrences = list.data?.status === 200 ? list.data.data : undefined;
  const upcoming = occurrences?.filter((o) => Date.parse(o.endAt ?? o.startAt) >= Date.now())
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  const loadFailed = list.isError || (list.data && list.data.status !== 200);
  const start = e.nextOccurrence?.startAt ?? e.startAt;
  const end = e.nextOccurrence ? e.nextOccurrence.endAt : e.endAt;
  const single = e.singleOccurrence;
  const length = duration(start, end);
  const relative = d.relative(start);

  return (
    <div className="space-y-5">
      {e.recurring && !e.nextOccurrence ? (
        <Note icon={<Info />} className="bg-lavender-soft">Ближайших запланированных занятий нет</Note>
      ) : (
        <div className="flex items-center gap-4 sm:gap-5">
          <div aria-hidden className="w-[84px] shrink-0 overflow-hidden rounded-2xl border-[2.5px] border-ink bg-card text-center shadow-hard-sm sm:w-24">
            <div className="bg-primary py-1 text-xs font-extrabold tracking-[1.5px] text-primary-foreground">{d.weekday(start)}</div>
            <div className="font-display text-[32px] leading-[38px] font-extrabold sm:text-4xl sm:leading-[42px]">{d.dayNumber(start)}</div>
            <div className="pb-2 text-[13px] font-bold">{d.month(start)}</div>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Eyebrow className="text-muted-foreground">{e.recurring ? "Ближайшее занятие" : "Начало и конец"}</Eyebrow>
            <p className="sr-only">{d.full(start)}</p>
            <p className={cn("font-display text-[26px] leading-8 font-extrabold sm:text-[30px] sm:leading-[38px]", single?.status === "CANCELLED" && "text-muted-foreground line-through")}>
              {d.time(start)}{end && ` – ${d.time(end)}`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {length && <Chip icon={<Clock />}>{length}</Chip>}
              {relative && <Chip className="bg-lime">{relative}</Chip>}
            </div>
          </div>
        </div>
      )}

      {single && <SingleStatus o={single} />}

      {e.schedule && <>
        <Note icon={<Repeat />} className="bg-lavender-soft">
          <span className="block first-letter:uppercase">{e.schedule.description}</span>
          <span className="mt-1 block text-[13px] leading-[18px] font-semibold text-muted-foreground">
            С {d.date(e.schedule.startDate)} по {d.date(e.schedule.endDate)} · время: {d.zone()}
          </span>
        </Note>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-base font-bold">Ближайшие занятия</h3>
          {upcoming && upcoming.length > 0 && <span className="text-xs font-extrabold text-muted-foreground">
            {all ? upcoming.length : Math.min(PREVIEW, upcoming.length)} из {upcoming.length}
          </span>}
        </div>
        {list.isPending && <p role="status" className="font-semibold text-muted-foreground">Загружаем расписание…</p>}
        {loadFailed && <div role="alert" className="space-y-3">
          <p className="font-semibold">{list.error?.detail ?? "Не удалось загрузить занятия. Попробуйте ещё раз."}</p>
          <Button variant="soft" onClick={() => void list.refetch()}>Повторить</Button>
        </div>}
        {upcoming?.length === 0 && <p className="font-semibold text-muted-foreground">Будущих занятий нет.</p>}
        {upcoming && upcoming.length > 0 && <ul className="space-y-2">
          {upcoming.slice(0, all ? undefined : PREVIEW).map((o) => <OccurrenceRow key={o.id} o={o} d={d} />)}
        </ul>}
        {upcoming && upcoming.length > PREVIEW && !all && (
          <button type="button" onClick={() => setAll(true)}
            className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-ink text-[15px] font-extrabold transition-colors hover:bg-lavender-soft focus-visible:outline-2 focus-visible:outline-ring">
            Показать все {upcoming.length} {plural(upcoming.length, ["занятие", "занятия", "занятий"])}<ChevronDown className="size-[18px]" />
          </button>
        )}
      </>}
    </div>
  );
}

/** Отмена или кворум разовой встречи — одной заметной карточкой. */
function SingleStatus({ o }: { o: OccurrenceResponse }) {
  if (o.status === "CANCELLED") return (
    <Note icon={<X />} iconClassName="bg-peach" className="bg-peach-soft" eyebrow="Встреча отменена" eyebrowClassName="text-orange-ink">
      {o.cancelReason ? `Причина: ${o.cancelReason}` : "Организатор отменил встречу"}
    </Note>
  );
  if (!o.quorum) return null;
  return o.quorum.takesPlace ? (
    <Note icon={<Check />} iconClassName="bg-mint" className="bg-mint-soft" eyebrow={OCCURRENCE_BADGE.TAKES_PLACE.label} eyebrowClassName="text-foreground">
      {o.quorum.status === "CONFIRMED" ? "Организатор подтвердил: встреча будет" : `Записались ${o.quorum.count}, нужно было ${o.quorum.required} — встреча точно будет`}
    </Note>
  ) : (
    <Note icon={<Users />} className="bg-lavender-soft" eyebrow={OCCURRENCE_BADGE.GATHERING.label} eyebrowClassName="text-foreground">
      Состоится, если наберётся {o.quorum.required}. Сейчас {o.quorum.count}
    </Note>
  );
}

function OccurrenceRow({ o, d }: { o: OccurrenceResponse; d: ReturnType<typeof dates> }) {
  const cancelled = o.status === "CANCELLED";
  const badge = cancelled ? { ...OCCURRENCE_BADGE.CANCELLED, icon: <X /> }
    : o.rescheduled ? { ...OCCURRENCE_BADGE.RESCHEDULED, icon: <Clock /> }
    : o.viewer.attending ? { ...OCCURRENCE_BADGE.ATTENDING, icon: <Check /> }
    : o.quorum?.takesPlace ? { ...OCCURRENCE_BADGE.TAKES_PLACE, icon: <Check /> }
    : o.quorum ? { ...OCCURRENCE_BADGE.GATHERING, icon: <Users /> }
    : undefined;
  const free = o.capacity != null ? Math.max(0, o.capacity - o.attendeesCount) : undefined;
  const note = cancelled ? (o.cancelReason ? `Причина: ${o.cancelReason}` : undefined) : [
    o.rescheduled && o.originalStartAt && `Было: ${d.full(o.originalStartAt)}`,
    o.quorum && (o.quorum.takesPlace ? `Придут ${o.attendeesCount}${o.capacity != null ? ` из ${o.capacity}` : ""}` : `${o.quorum.count} из ${o.quorum.required} для кворума`),
    free != null && !o.quorum?.takesPlace && (free ? `свободно ${free} ${plural(free, ["место", "места", "мест"])}` : "мест нет"),
  ].filter(Boolean).join(" · ");
  return (
    <li className={cn("rounded-[14px] border-2 border-ink px-4 py-3", cancelled ? "bg-peach-soft" : "bg-card")}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-16 shrink-0">
          <p className="text-[11px] font-extrabold tracking-[1px] text-muted-foreground">{d.weekday(o.startAt)}</p>
          <p className="font-display text-[15px] font-bold whitespace-nowrap">{d.short(o.startAt)}</p>
        </div>
        <p className={cn("min-w-0 flex-1 text-[17px] font-extrabold", cancelled && "text-muted-foreground line-through")}>
          {d.time(o.startAt)}{o.endAt && ` – ${d.time(o.endAt)}`}
        </p>
        {badge && <Chip className={badge.tone} icon={badge.icon}>{badge.label}</Chip>}
      </div>
      {note && <p className={cn("mt-1 pl-[76px] text-[13px] leading-[18px] font-semibold sm:pl-20", cancelled ? "text-orange-ink" : "text-muted-foreground")}>{note}</p>}
    </li>
  );
}

function WhereTab({ e }: { e: EventResponse }) {
  const point: [number, number] | null = e.format === "OFFLINE" && e.lon != null && e.lat != null ? [e.lon, e.lat] : null;
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Адрес скопирован");
    } catch {
      toast.error("Не удалось скопировать — выделите адрес вручную");
    }
  };
  return (
    <div className="space-y-5">
      {e.format === "ONLINE" ? (
        <div className="flex items-center gap-3.5">
          <IconCircle className="bg-lime"><Video /></IconCircle>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold">Онлайн-встреча</p>
            <p className="text-sm font-semibold text-muted-foreground">Подключение по ссылке</p>
          </div>
        </div>
      ) : <>
        {point && <LocationPicker value={point} className="h-[188px] w-full rounded-[20px]" />}
        <div className="flex items-center gap-3.5">
          <IconCircle className="bg-lime"><MapPin /></IconCircle>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-6 font-bold break-words sm:text-xl sm:leading-[26px]">{e.address ? placeName(e.address) : "Адрес уточняется"}</p>
            {e.address && <p className="text-sm font-semibold break-words text-muted-foreground">{e.address}</p>}
          </div>
          {e.address && <Button variant="soft" size="sm" rough={false} className="shrink-0 max-sm:size-11 max-sm:px-0" aria-label="Скопировать адрес" onClick={() => void copy(e.address!)}>
            <Copy /><span className="max-sm:sr-only">Скопировать</span>
          </Button>}
        </div>
        {e.locationNote && (
          <Note icon={<DoorOpen />} iconClassName="bg-peach" className="bg-peach-soft" eyebrow="Как найти" eyebrowClassName="text-orange-ink">{e.locationNote}</Note>
        )}
      </>}

      {e.viewer.canSeePrivateDetails ? (
        <div className="space-y-3 rounded-2xl border-2 border-ink bg-lime-soft p-4 shadow-hard-sm">
          <Eyebrow className="flex items-center gap-2 text-foreground"><LockOpen className="size-4" />Только для участников · открыто</Eyebrow>
          {e.format === "ONLINE" && e.onlineUrl && (
            <a href={e.onlineUrl} target="_blank" rel="noreferrer" className="block text-base font-extrabold break-all text-primary underline">{e.onlineUrl}</a>
          )}
          {e.privateDetails ? <p className="text-[15px] leading-[21px] font-semibold break-words whitespace-pre-wrap"><Linkified text={e.privateDetails} /></p>
            : !(e.format === "ONLINE" && e.onlineUrl) && <p className="text-[15px] font-semibold text-muted-foreground">{privateNote(e)}</p>}
          {e.format === "ONLINE" && e.onlineUrl && (
            <Button asChild className="w-full sm:w-auto"><a href={e.onlineUrl} target="_blank" rel="noreferrer"><Video />Подключиться</a></Button>
          )}
        </div>
      ) : (
        <Note icon={<Lock />} className="border-dashed bg-lime-soft" eyebrow="Только для участников" eyebrowClassName="text-foreground">{privateNote(e)}</Note>
      )}

      {point && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* от дома из профиля; без дома — просто точка встречи, свой адрес человек введёт в 2ГИС */}
          <RouteButton to={{ lon: point[0], lat: point[1] }} variant="ink" className="h-auto min-h-12 flex-1 whitespace-normal">
            <Navigation />Построить маршрут
          </RouteButton>
          <Button asChild variant="soft" className="h-auto min-h-12 flex-1 whitespace-normal shadow-hard-sm">
            <a href={dgisPlace({ lon: point[0], lat: point[1] })} target="_blank" rel="noreferrer"><ExternalLink />Открыть в 2ГИС</a>
          </Button>
        </div>
      )}
    </div>
  );
}

function RegistrationTab({ e }: { e: EventResponse }) {
  const d = dates(e.schedule?.timeZone);
  const list = useOccurrencesList(e.id, undefined, { query: { enabled: e.recurring } });
  const occurrences = list.data?.status === 200 ? list.data.data : undefined;
  const nearest = e.recurring ? occurrences?.find((o) => o.id === e.nextOccurrence?.id) : e.singleOccurrence;
  const capacity = nearest?.capacity ?? e.capacity;
  // Число принятых в серию не равно числу отметок на конкретное занятие.
  const count = e.recurring ? nearest?.attendeesCount : e.participantsCount;
  const free = capacity != null && count != null ? Math.max(0, capacity - count) : undefined;
  const quorum = nearest?.quorum;
  const loadFailed = list.isError || (list.data && list.data.status !== 200);
  const equipment = e.equipment?.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean) ?? [];
  const tiles = [
    capacity != null ? ["Мест", String(capacity), e.recurring ? "на каждое занятие" : "всего"] : ["Мест", "∞", "без лимита"],
    free != null && ["Свободно", String(free), e.recurring ? "на ближайшее" : "сейчас", free <= 3],
    capacity == null && count != null && ["Записались", String(count), e.recurring ? "на ближайшее" : "сейчас"],
    e.minParticipants != null && ["Состоится от", String(e.minParticipants), plural(e.minParticipants, ["участника", "участников", "участников"])],
  ].filter(Boolean) as [string, string, string, boolean?][];

  return (
    <div className="space-y-5">
      {e.joinMode === "FREE" ? (
        <Note icon={<Check />} iconClassName="bg-mint" className="bg-mint-soft">
          <span className="block font-display text-lg">{JOIN_MODE_LABEL.FREE}</span>
          <span className="block text-sm font-semibold">Нажали «Записаться» — и вы участник. Одобрение организатора не нужно.</span>
        </Note>
      ) : (
        <Note icon={<UserCheck />} iconClassName="bg-sky" className="bg-sky-soft">
          <span className="block font-display text-lg">{JOIN_MODE_LABEL.REQUEST}</span>
          <span className="block text-sm font-semibold">Отправьте заявку — организатор рассмотрит её и решит, принять ли вас. Статус появится в «Моих записях».</span>
        </Note>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {tiles.map(([label, value, sub, warn]) => (
          <div key={label} className="min-w-0 rounded-2xl border-2 border-ink bg-card px-2.5 py-3 shadow-hard-sm sm:px-4 sm:py-3.5">
            <Eyebrow className="text-muted-foreground">{label}</Eyebrow>
            <p className={cn("font-display text-[30px] leading-[38px] font-extrabold", warn && "text-orange-ink")}>{value}</p>
            <p className="text-xs font-semibold text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {(capacity != null || quorum) && (
        <div className="space-y-3 rounded-2xl border-2 border-ink bg-lavender-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Eyebrow className="text-primary">{e.recurring && e.nextOccurrence ? `Ближайшее занятие · ${d.weekday(e.nextOccurrence.startAt)} ${d.short(e.nextOccurrence.startAt)}` : "Места"}</Eyebrow>
            {nearest?.status === "CANCELLED" ? <Chip className={OCCURRENCE_BADGE.CANCELLED.tone} icon={<X />}>{OCCURRENCE_BADGE.CANCELLED.label}</Chip>
              : quorum && (quorum.takesPlace ? <Chip className={OCCURRENCE_BADGE.TAKES_PLACE.tone} icon={<Check />}>{OCCURRENCE_BADGE.TAKES_PLACE.label}</Chip>
                : <Chip className={OCCURRENCE_BADGE.GATHERING.tone} icon={<Users />}>{OCCURRENCE_BADGE.GATHERING.label}</Chip>)}
          </div>
          {e.recurring && e.nextOccurrence && !nearest ? (
            <p className="font-semibold">{loadFailed ? "Не удалось загрузить места и кворум занятия." : "Загружаем места и кворум занятия…"}</p>
          ) : <>
            {capacity != null && count != null && <Seats capacity={capacity} taken={count} quorum={e.minParticipants} />}
            <p className="text-sm font-bold">
              {[
                count != null && (capacity != null ? `Придут ${count} из ${capacity}` : `Придут ${count}`),
                quorum && (quorum.takesPlace ? `кворум (${quorum.required}) набран, встреча точно состоится` : `для кворума нужно ${quorum.required}`),
                nearest?.status === "CANCELLED" && nearest.cancelReason && `причина отмены: ${nearest.cancelReason}`,
              ].filter(Boolean).join(" · ")}
            </p>
            {!e.recurring && free === 0 && e.joinMode === "FREE" && <p className="text-sm font-semibold">Мест пока нет. При записи вы попадёте в лист ожидания и займёте место, как только оно освободится.</p>}
          </>}
        </div>
      )}

      {e.recurring && (
        <div className="flex gap-3 rounded-2xl border-2 border-ink bg-sky-soft p-3.5">
          <Info aria-hidden className="mt-0.5 size-[22px] shrink-0" />
          <p className="text-sm leading-5 font-semibold">Записываетесь на серию один раз, а потом отмечаете «Приду» на нужные даты. Места и кворум считаются для каждого занятия отдельно.</p>
        </div>
      )}

      <div className="space-y-3.5">
        <h3 className="font-display text-base font-bold">Условия</h3>
        <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-[120px_1fr]">
          <dt className="text-[13px] font-extrabold text-muted-foreground">Уровень</dt>
          <dd><Chip>{EVENT_LEVEL_LABEL[e.level]}</Chip></dd>
          {e.requirements && <>
            <dt className="text-[13px] font-extrabold text-muted-foreground">Требования</dt>
            <dd className="text-[15px] leading-[21px] font-bold break-words whitespace-pre-wrap">{e.requirements}</dd>
          </>}
          {equipment.length > 0 && <>
            <dt className="text-[13px] font-extrabold text-muted-foreground">Что взять</dt>
            <dd className="flex flex-wrap gap-1.5">{equipment.map((item) => <Chip key={item} className="bg-lime-soft">{item}</Chip>)}</dd>
          </>}
        </dl>
      </div>
    </div>
  );
}

/** Места квадратиками: занятые синие, черта — порог кворума. Много мест — полосой. */
function Seats({ capacity, taken, quorum }: { capacity: number; taken: number; quorum?: number }) {
  if (capacity > MAX_SEATS) return (
    <div aria-hidden className="h-3 overflow-hidden rounded-full border-2 border-ink bg-card">
      <div className="h-full bg-primary" style={{ width: `${Math.min(100, (taken / capacity) * 100)}%` }} />
    </div>
  );
  return (
    <div aria-hidden className="flex flex-wrap items-center gap-1.5">
      {Array.from({ length: capacity }, (_, i) => <span key={i} className="contents">
        <span className={cn("size-[26px] rounded-md border-2 border-ink sm:size-[30px]", i < taken ? "bg-primary" : "bg-card")} />
        {quorum != null && i === quorum - 1 && i < capacity - 1 && <span className="h-9 w-[3px] rounded-full bg-ink" />}
      </span>)}
    </div>
  );
}
