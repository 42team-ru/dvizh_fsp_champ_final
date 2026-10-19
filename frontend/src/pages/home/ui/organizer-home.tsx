import { coverOf } from "@/entity/event/lib/cover";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight, ArrowUpRight, CalendarPlus, Check, Clock, Megaphone, MapPin, MessageCircle, Plus, Repeat, Trophy,
  UserPlus, UserMinus, Users, Zap,
} from "lucide-react";
import { cn } from "cn";
import { useUser } from "@/entity/user/model/use-user";
import { useEventsAnnounce, useEventsClearAnnouncement, useEventsGet, getEventsGetQueryKey } from "@/shared/api/generated/core/events/events";
import { useOccurrencesAttendees, useOccurrencesConfirm, getOccurrencesListQueryKey } from "@/shared/api/generated/core/occurrences/occurrences";
import { useNotificationsList, useNotificationsReadAll, useNotificationsUnreadCounts } from "@/shared/api/generated/core/notifications/notifications";
import { useOrganizationsFeatured, useOrganizationsMe } from "@/shared/api/generated/core/organizations/organizations";
import type { EventSummaryResponse, NotificationResponse, NotificationsListTypesItem, OccurrenceResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { JOIN_MODE_LABEL } from "@/shared/lib/statuses";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { MyBeaverBadge } from "@/widgets/beaver-pet/ui/my-beaver-badge";
import { Chip, PillTabs, Warning, textareaClass } from "@/pages/cabinet/ui/parts";
import { ago, hm } from "@/pages/cabinet/model/format";
import { startOfDay, useOrganizerHome, type SeriesStat, type WeekSlot } from "../model/use-organizer-home";

const WEEKDAYS = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const CARD = "rounded-[24px] border-2 border-ink bg-card";
const TITLE = "font-display text-[22px] leading-7 font-extrabold text-foreground";
const LABEL = "text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase";

const plural = (n: number, forms: [string, string, string]) => {
  const m10 = n % 10, m100 = n % 100;
  return forms[m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2];
};
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = startOfDay(new Date());
  const diff = Math.round((startOfDay(d).getTime() - today.getTime()) / 86_400_000);
  const when = diff === 0 ? "Сегодня" : diff === 1 ? "Завтра" : `${WEEKDAYS[d.getDay()][0]}${WEEKDAYS[d.getDay()].slice(1).toLowerCase()} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return `${when}, ${hm(iso)}`;
};

/** «2 ч 40 мин» до начала; обновляется раз в минуту. */
function useCountdown(iso?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return "";
  const min = Math.max(0, Math.round((new Date(iso).getTime() - now) / 60_000));
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  return d > 0 ? `${d} ${plural(d, ["день", "дня", "дней"])} ${h} ч` : h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

/** Цвет занятия по кворуму: собираем — персик, набран — лайм, подтверждено — лаванда. */
function quorumTone(o: OccurrenceResponse) {
  if (o.status === "CANCELLED") return "bg-salmon/60";
  if (!o.quorum) return "bg-mint-soft";
  return o.quorum.status === "CONFIRMED" ? "bg-lavender-soft" : o.quorum.status === "REACHED" ? "bg-lime-soft" : "bg-peach";
}
const quorumDot = (o: OccurrenceResponse) =>
  !o.quorum ? undefined : o.quorum.status === "CONFIRMED" ? "bg-primary" : o.quorum.status === "REACHED" ? "bg-secondary" : "bg-orange";

/** Мемфис-декор героя: волна, плюс, круг, треугольник. */
function HeroDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute top-6 left-[46%] h-4 w-24 text-secondary" viewBox="0 0 96 16"><path d="M2 12 10 4l8 8 8-8 8 8 8-8 8 8 8-8 8 8 8-8 8 8 8-8" fill="none" stroke="currentColor" strokeWidth="3" /></svg>
      <Plus className="absolute top-7 left-[59%] size-6 text-white" strokeWidth={3} />
      <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-12 left-[71%] size-7 rounded-full border-[3px] border-white" />
      <motion.svg animate={{ rotate: [0, 12, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-[150px] left-[66%] size-10 text-secondary" viewBox="0 0 40 36"><path d="M20 2 38 34H2Z" fill="currentColor" stroke="var(--ink)" strokeWidth="2.5" /></motion.svg>
      <div className="absolute top-[245px] left-[61%] grid grid-cols-5 gap-2 opacity-40">{Array.from({ length: 15 }, (_, i) => <span key={i} className="size-1 rounded-full bg-white" />)}</div>
    </div>
  );
}

/** Герой: ближайшее занятие, сколько придут, кворум и обратный отсчёт. */
function Hero({ slot, orgName }: { slot?: WeekSlot; orgName?: string }) {
  const { user } = useUser();
  const e = slot?.event, o = slot?.occurrence;
  const countdown = useCountdown(o?.startAt);
  const attendees = useOccurrencesAttendees(e?.id ?? "", o?.id ?? "", { query: { enabled: !!o } });
  const people = attendees.data?.status === 200 ? attendees.data.data : [];
  const confirm = useOccurrencesConfirm();
  const client = useQueryClient();
  const isToday = o && startOfDay(new Date(o.startAt)).getTime() === startOfDay(new Date()).getTime();
  const greet = `Привет${user?.firstName ? `, ${user.firstName}` : ""}!`;

  if (!e || !o) {
    return (
      <section className={cn(CARD, "relative overflow-hidden bg-primary p-8 text-white shadow-hard")}>
        <HeroDecor />
        <p className="relative text-[13px] font-bold text-white/80">{greet} {orgName ? `Клуб «${orgName}»` : ""}</p>
        <h1 className="relative mt-2 max-w-[560px] font-display text-[44px] leading-[50px] font-extrabold">Занятий на неделе пока нет</h1>
        <p className="relative mt-3 max-w-[520px] text-[15px] font-medium text-white/85">Опубликуйте встречу — она сразу появится в ленте и на карте.</p>
        <Button asChild variant="secondary" size="lg" className="relative mt-6">
          <Link to="/events/new"><CalendarPlus className="size-4" />Создать встречу</Link>
        </Button>
      </section>
    );
  }

  const going = o.attendeesCount;
  const cap = o.capacity ?? e.capacity;
  const q = o.quorum;
  const end = o.endAt ? `–${hm(o.endAt)}` : "";
  return (
    <section className={cn(CARD, "relative grid gap-6 overflow-hidden bg-primary p-6 text-white shadow-hard sm:p-8 lg:grid-cols-[minmax(0,1fr)_336px]")}>
      <HeroDecor />
      <div className="relative flex min-w-0 flex-col gap-4">
        <p className="text-[13px] font-bold text-white/85">{greet} {isToday ? "Сегодня" : "Ближайшее занятие"}{orgName ? ` в клубе «${orgName}»` : ""}</p>
        <h1 className="font-display text-[38px] leading-[44px] font-extrabold break-words sm:text-[46px] sm:leading-[52px]">{e.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Chip tone="bg-card" className="gap-1.5 normal-case"><Clock className="size-3" strokeWidth={2.6} />{hm(o.startAt)}{end}</Chip>
          {(e.address || e.format === "ONLINE") && (
            <Chip tone="bg-card" className="max-w-[260px] gap-1.5 normal-case"><MapPin className="size-3" strokeWidth={2.6} /><span className="truncate">{e.format === "ONLINE" ? "Онлайн" : e.address}</span></Chip>
          )}
          {e.recurring && <Chip tone="bg-card" className="gap-1.5 normal-case"><Repeat className="size-3" strokeWidth={2.6} />серия{e.scheduleDescription ? ` · ${e.scheduleDescription}` : ""}</Chip>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <span className="font-display text-lg font-extrabold">Придут {going}{cap ? ` из ${cap}` : ""}</span>
          {q && (
            <Chip tone={q.takesPlace ? "bg-secondary" : "bg-peach"} className="gap-1 text-[10px]">
              {q.takesPlace && <Check className="size-3" strokeWidth={3} />}кворум {q.required} — {q.takesPlace ? "набран" : `ещё ${Math.max(0, q.required - q.count)}`}
            </Chip>
          )}
        </div>
        {cap ? (
          <div className="relative h-3.5 w-full max-w-[460px] overflow-hidden rounded-full border-2 border-ink bg-lavender-soft">
            <motion.span initial={{ width: 0 }} animate={{ width: `${Math.min(100, (going / cap) * 100)}%` }} transition={{ type: "spring", stiffness: 90, damping: 18 }}
              className="block h-full bg-secondary" />
            {q && <span className="absolute top-0 h-full w-[3px] bg-ink" style={{ left: `${Math.min(100, (q.required / cap) * 100)}%` }} />}
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-3">
          <Button asChild variant="secondary" size="lg">
            <Link to={`/my/events/${e.id}/manage`}><Users className="size-4" />Кто придёт · {going}</Link>
          </Button>
          <Button asChild variant="clear" size="lg">
            <a href="#announce"><Megaphone className="size-4" />Объявление участникам</a>
          </Button>
        </div>
      </div>

      <div className="relative flex flex-col overflow-hidden rounded-[22px] border-[3px] border-ink bg-card text-foreground shadow-hard self-start">
        <div className="flex flex-col gap-2 bg-lime-soft px-5 pt-4 pb-5">
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="bg-card" className="px-2 py-px text-[10px] normal-case">{e.sport.name}</Chip>
            <Chip tone="bg-secondary" className="px-2 py-px text-[10px]">{dayLabel(o.startAt).split(",")[0]}</Chip>
          </div>
          <p className={LABEL}>Начало через</p>
          <p className="font-display text-[32px] leading-9 font-extrabold">{countdown}</p>
        </div>
        <div className="flex flex-col gap-3 border-t-2 border-dashed border-ink px-5 pt-4 pb-5">
          {people.length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {people.slice(0, 5).map((p) => <UserAvatar key={p.id} user={p} className="size-8 rounded-full border-2 border-ink" />)}
                {people.length > 5 && <span className="flex size-8 items-center justify-center rounded-full border-2 border-ink bg-ink text-[10px] font-extrabold text-white">+{people.length - 5}</span>}
              </div>
              <span className="min-w-0 truncate text-[13px] font-bold">
                {people.slice(0, 2).map((p) => p.firstName).join(", ")}{people.length > 2 ? ` и ещё ${people.length - 2}` : ""}
              </span>
            </div>
          ) : (
            <p className="text-[13px] font-bold text-muted-foreground">Пока никто не отметился.</p>
          )}
          {q && q.status !== "CONFIRMED" ? (
            <>
              <p className="text-xs leading-4 font-medium text-muted-foreground">
                {q.takesPlace ? "Кворум набран. Подтверди, что занятие состоится, — участники получат уведомление." : `Не хватает ${q.required - q.count} до кворума. Можно подтвердить и раньше.`}
              </p>
              <Button variant="ink" rough={false} className="w-full shadow-none" disabled={confirm.isPending}
                onClick={() => confirm.mutate({ id: e.id, occurrenceId: o.id }, {
                  onSuccess: () => void client.invalidateQueries({ queryKey: getOccurrencesListQueryKey(e.id).slice(0, 1) }),
                })}>
                <Check className="size-4" strokeWidth={3} />Подтвердить: состоится
              </Button>
              {confirm.error?.detail && <Warning className="py-2">{confirm.error.detail}</Warning>}
            </>
          ) : (
            <p className="text-xs leading-4 font-medium text-muted-foreground">
              {q?.status === "CONFIRMED" ? "Вы подтвердили: занятие состоится." : "Участники видят место и время в своих записях."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Подсказка Бублика: где больше всего заявок ждут решения. */
function BublikHint({ busiest }: { busiest?: { event: EventSummaryResponse; pending: number } }) {
  const [later, setLater] = useState(false);
  if (!busiest || later) return null;
  const { event: e, pending } = busiest;
  const free = e.capacity != null ? Math.max(0, e.capacity - e.participantsCount) : undefined;
  return (
    <section className="relative flex flex-wrap items-center gap-4 rounded-[24px] border-2 border-ink bg-mint-soft py-5 pr-5 pl-5 sm:pl-[140px]">
      <MyBeaverBadge className="absolute top-[-18px] left-3 hidden h-[110px] w-[120px] sm:block" />
      <div className="min-w-0 flex-1">
        <p className={LABEL}>Бублик подсказывает</p>
        <p className="mt-1 font-display text-[17px] leading-[22px] font-bold text-foreground">
          {pending} {plural(pending, ["заявка", "заявки", "заявок"])} на «{e.title}» {pending === 1 ? "ждёт" : "ждут"} ответа
          {free !== undefined ? `, а ${free === 0 ? "мест уже нет" : `свободно ${free} ${plural(free, ["место", "места", "мест"])}`}` : ""}
        </p>
      </div>
      <Button asChild variant="ink" rough={false} className="shadow-none"><Link to={`/my/events/${e.id}/manage`}>Разобрать заявки</Link></Button>
      <Button variant="outline" rough={false} className="shadow-none" onClick={() => setLater(true)}>Позже</Button>
    </section>
  );
}

function Pulse({ label, value, hint, tone = "bg-card", children }: { label: string; value: number; hint: string; tone?: string; children?: ReactNode }) {
  return (
    <div className={cn(CARD, "flex min-w-0 flex-col gap-2 px-5 py-4", tone)}>
      <p className={LABEL}>{label}</p>
      <p className="flex items-baseline gap-2"><span className="font-display text-[32px] leading-9 font-extrabold text-foreground">{value}</span><span className="text-xs font-medium text-muted-foreground">{hint}</span></p>
      {children}
    </div>
  );
}

/** Неделя клуба: семь дней вперёд с занятиями, цвет — состояние кворума. */
function Week({ week, series }: { week: WeekSlot[]; series: SeriesStat[] }) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() + i * 86_400_000));
  const last = days[6];
  return (
    <section className={cn(CARD, "flex min-w-0 flex-col gap-4 p-5 sm:p-6")}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className={TITLE}>Неделя клуба</h2>
        <Chip tone="bg-lavender-soft" className="normal-case">{days[0].getDate()}–{last.getDate()} {MONTHS[last.getMonth()]}</Chip>
      </div>
      <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
        <div className="grid min-w-[640px] grid-cols-7 gap-2">
          {days.map((d, i) => {
            const slots = week.filter((s) => startOfDay(new Date(s.occurrence.startAt)).getTime() === d.getTime());
            return (
              <div key={i} className="flex flex-col gap-2">
                <div className={cn("flex flex-col items-center rounded-[12px] py-1.5", i === 0 ? "bg-ink text-white" : "bg-background text-foreground")}>
                  <span className="text-[9px] font-extrabold tracking-[1px]">{WEEKDAYS[d.getDay()]}</span>
                  <span className="font-display text-lg leading-6 font-extrabold">{d.getDate()}</span>
                </div>
                {slots.length === 0 ? (
                  <Link to="/events/new" className="flex h-[78px] flex-col items-center justify-center gap-1 rounded-[12px] border-2 border-dashed border-track text-muted-foreground transition-colors hover:border-ink hover:text-foreground">
                    <Plus className="size-4" strokeWidth={2.4} /><span className="text-[10px] font-bold">свободно</span>
                  </Link>
                ) : slots.map(({ event: e, occurrence: o }) => (
                  <Link key={o.id} to={`/my/events/${e.id}/manage`}
                    className={cn("flex flex-col gap-1 rounded-[12px] border-2 border-ink p-2 transition-transform hover:-translate-y-0.5", quorumTone(o))}>
                    <span className={cn("font-display text-[15px] leading-5 font-extrabold", o.status === "CANCELLED" && "line-through")}>{hm(o.startAt)}</span>
                    <span className="line-clamp-2 text-[11px] leading-[14px] font-bold text-foreground">{e.title}</span>
                    {o.status === "CANCELLED" ? (
                      <span className="text-[10px] font-extrabold text-orange-ink">отменено</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold text-foreground">
                        {quorumDot(o) && <span className={cn("size-2 rounded-full border border-ink", quorumDot(o))} />}
                        <Users className="size-3" strokeWidth={2.6} />{o.attendeesCount}{o.capacity ? `/${o.capacity}` : ""}
                      </span>
                    )}
                    {o.rescheduled && <span className="text-[9px] font-medium text-muted-foreground">перенесено</span>}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {series.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[18px] border-2 border-track p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <p className={LABEL}>Посещаемость серий · последние занятия</p>
            <p className="text-[10px] font-medium text-muted-foreground">отметки «приду» по занятиям</p>
          </div>
          {series.map((s) => {
            const max = Math.max(1, s.capacity ?? 0, ...s.past);
            return (
              <div key={s.event.id} className="flex items-center gap-3">
                <span className="w-[180px] shrink-0 truncate text-[13px] font-extrabold text-foreground">{s.event.title}</span>
                <div className="flex h-6 flex-1 items-end gap-1">
                  {s.past.map((n, i) => (
                    <motion.span key={i} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }} style={{ height: `${Math.max(12, (n / max) * 100)}%`, originY: 1 }}
                      className={cn("w-full max-w-5 rounded-[3px]", i === s.past.length - 1 ? "bg-primary" : "bg-lilac")} />
                  ))}
                </div>
                <span className="w-[72px] shrink-0 text-right text-xs font-bold text-muted-foreground">≈ {s.avg}{s.capacity ? ` из ${s.capacity}` : ""}</span>
                <Chip tone={s.trend > 0 ? "bg-secondary" : s.trend < 0 ? "bg-salmon" : "bg-card"} className="w-10 justify-center px-1 text-[10px]">
                  {s.trend > 0 ? `+${s.trend}` : s.trend < 0 ? s.trend : "±0"}
                </Chip>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-[11px] font-bold text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border border-ink bg-orange" />собираем кворум</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border border-ink bg-secondary" />кворум набран</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border border-ink bg-primary" />подтверждено</span>
        <span className="ml-auto">цифра — сколько отметились «приду»</span>
      </div>
    </section>
  );
}

type InboxTab = "ALL" | "REG" | "DISC" | "QUORUM";
const INBOX_TYPES: Record<InboxTab, NotificationsListTypesItem[] | undefined> = {
  ALL: undefined,
  REG: ["REGISTRATION_CREATED", "REGISTRATION_CANCELLED"],
  DISC: ["COMMENT_CREATED", "COMMENT_REPLY"],
  QUORUM: ["QUORUM_REACHED", "QUORUM_LOST", "OCCURRENCE_CONFIRMED"],
};
const inboxIcon = (n: NotificationResponse) =>
  n.type === "REGISTRATION_CREATED" ? { icon: UserPlus, tone: "bg-peach" }
  : n.type === "REGISTRATION_CANCELLED" ? { icon: UserMinus, tone: "bg-lavender-soft" }
  : n.type.startsWith("QUORUM") ? { icon: Zap, tone: n.type === "QUORUM_LOST" ? "bg-salmon" : "bg-secondary" }
  : n.category === "DISCUSSIONS" ? { icon: MessageCircle, tone: "bg-sky-soft" }
  : { icon: Users, tone: "bg-mint-soft" };

/** Входящие: записи, обсуждения и кворум — настоящие уведомления. */
function Inbox() {
  const [tab, setTab] = useState<InboxTab>("ALL");
  const list = useNotificationsList({ size: 6, types: INBOX_TYPES[tab] });
  const counts = useNotificationsUnreadCounts();
  const readAll = useNotificationsReadAll();
  const client = useQueryClient();
  const items = list.data?.status === 200 ? list.data.data.items : [];
  const unread = (types?: string[]) =>
    (counts.data?.status === 200 ? counts.data.data : []).filter((c) => !types || types.includes(c.type)).reduce((s, c) => s + c.unread, 0);
  const total = unread();
  return (
    <section className={cn(CARD, "flex min-w-0 flex-col gap-4 p-5 sm:p-6")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={TITLE}>Входящие</h2>
        {total > 0 && <Chip tone="bg-accent" className="text-[10px] text-white normal-case">{total} {plural(total, ["новое", "новых", "новых"])}</Chip>}
      </div>
      <PillTabs value={tab} onChange={setTab} className="self-start"
        tabs={[
          { key: "ALL", label: "Все", count: total },
          { key: "REG", label: "Записи", count: unread(INBOX_TYPES.REG) },
          { key: "DISC", label: "Обсуждения", count: unread(INBOX_TYPES.DISC) },
          { key: "QUORUM", label: "Кворум", count: unread(INBOX_TYPES.QUORUM) },
        ]} />
      <div className="flex flex-col">
        {list.isPending ? (
          <p className="text-sm font-bold text-muted-foreground">Загружаем…</p>
        ) : items.length === 0 ? (
          <EmptyState size="sm" icon={MessageCircle} tone="bg-sky" title="Здесь пока тихо" text="Новые записи, вопросы и кворум появятся тут." />
        ) : items.map((n) => {
          const { icon: Icon, tone } = inboxIcon(n);
          return (
            <Link key={n.id} to={n.targetPath} className="flex items-start gap-3 border-b-[1.5px] border-track py-3 last:border-0">
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px] border-2 border-ink", tone)}><Icon className="size-4" strokeWidth={2.4} /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-extrabold text-foreground">{n.title}</span>
                <span className="line-clamp-2 text-xs font-medium text-muted-foreground">{n.body}</span>
                <span className="text-[11px] font-medium text-muted-foreground">{ago(n.createdAt)}</span>
              </span>
              {!n.readAt && <span className="mt-1 size-2 shrink-0 rounded-full bg-orange" aria-label="не прочитано" />}
            </Link>
          );
        })}
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 text-[13px] font-extrabold">
        <button type="button" disabled={total === 0 || readAll.isPending} className="text-primary disabled:opacity-40"
          onClick={() => readAll.mutate(undefined as never, { onSuccess: () => void client.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/notifications") }) })}>
          Прочитать всё
        </button>
        <Link to="/activity" className="flex items-center gap-1 text-foreground hover:underline">Все уведомления <ArrowRight className="size-3.5" strokeWidth={2.6} /></Link>
      </div>
    </section>
  );
}

const COVER_TONES = ["bg-sun", "bg-mint", "bg-sky"];

/** Карточка «Мои мероприятия»: обложка, сколько придут, состояние и действия. */
function MyEventCard({ e, pending, index }: { e: EventSummaryResponse; pending: number; index: number }) {
  const going = e.occurrenceAttendeesCount ?? e.participantsCount;
  const pct = e.capacity ? Math.round((going / e.capacity) * 100) : undefined;
  const photo = coverOf(e);
  return (
    <motion.article initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 240, damping: 24, delay: index * 0.06 }} whileHover={{ y: -4 }}
      className={cn(CARD, "flex min-w-0 flex-col overflow-hidden")}>
      <div className={cn("relative h-[120px] border-b-2 border-ink", COVER_TONES[index % COVER_TONES.length])}>
        {photo.src && <img src={photo.src} style={{ objectPosition: photo.position }} alt="" className="absolute inset-0 size-full object-cover" />}
        <Chip tone="bg-card" className="absolute top-3 left-3 px-2 py-px text-[10px] normal-case">{e.sport.name}</Chip>
        <Chip tone="bg-secondary" className="absolute bottom-3 left-3 gap-1 px-2 py-px text-[10px] normal-case"><Clock className="size-3" />{dayLabel(e.startAt)}</Chip>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="font-display text-base leading-5 font-extrabold text-foreground">{e.title}</h3>
        <div className="flex justify-between text-xs font-bold text-foreground">
          <span>{e.joinMode === "REQUEST" ? "Принято" : "Придут"} {going}{e.capacity ? ` из ${e.capacity}` : ""}</span>
          {pct !== undefined && <span className="text-muted-foreground">{pct}%</span>}
        </div>
        {pct !== undefined && (
          <div className="h-2 overflow-hidden rounded-full bg-lavender-soft"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} /></div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {e.quorumStatus && (
            <Chip tone={e.quorumStatus === "GATHERING" ? "bg-accent text-white" : "bg-secondary"} className={cn("px-2 py-px text-[9px]", e.quorumStatus === "GATHERING" && "text-white")}>
              {e.quorumStatus === "GATHERING" ? `собираем ${going}/${e.minParticipants}` : e.quorumStatus === "CONFIRMED" ? "подтверждено" : "кворум набран"}
            </Chip>
          )}
          {pending > 0 && <Chip tone="bg-peach" className="px-2 py-px text-[9px]">заявок {pending}</Chip>}
          <Chip className="px-2 py-px text-[9px] normal-case">{JOIN_MODE_LABEL[e.joinMode].toLowerCase()}</Chip>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm"><Link to={`/my/events/${e.id}/manage`}>Управлять</Link></Button>
          <Button asChild variant="outline" size="sm" rough={false} className="shadow-none">
            <Link to={`/events/${e.id}`}><ArrowUpRight className="size-3.5" strokeWidth={2.6} />Открыть в ленте</Link>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

/** Объявление участникам: закрепляется вверху карточки и приходит уведомлением. */
function Announce({ events }: { events: EventSummaryResponse[] }) {
  const [id, setId] = useState<string>();
  const selected = id ?? events[0]?.id;
  const event = useEventsGet(selected ?? "", { query: { enabled: !!selected } });
  const current = event.data?.status === 200 ? event.data.data.announcement : undefined;
  const [text, setText] = useState("");
  const announce = useEventsAnnounce();
  const clear = useEventsClearAnnouncement();
  const client = useQueryClient();
  const refresh = () => selected && void client.invalidateQueries({ queryKey: getEventsGetQueryKey(selected) });
  const title = events.find((e) => e.id === selected)?.title;
  const shown = text.trim() || current;

  if (events.length === 0) return null;
  return (
    <section id="announce" className={cn(CARD, "flex min-w-0 scroll-mt-6 flex-col gap-4 p-5 sm:p-6")}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border-2 border-ink bg-sun"><Megaphone className="size-5" strokeWidth={2.4} /></span>
        <div>
          <h2 className={TITLE}>Объявление участникам</h2>
          <p className="text-xs font-medium text-muted-foreground">Закрепится вверху карточки и придёт уведомлением записавшимся.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="flex flex-col gap-3">
          <select value={selected} onChange={(ev) => { setId(ev.target.value); setText(""); }}
            className="h-11 rounded-pill border-2 border-ink bg-card px-4 text-sm font-extrabold text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30">
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <textarea rows={4} maxLength={1000} value={text} onChange={(ev) => setText(ev.target.value)}
            placeholder={current ? "Новое объявление заменит текущее" : "Например: завтра играем в зале, сбор в 19:15 у входа №2"} className={textareaClass} />
          <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
            <span>{current ? "Новое объявление заменит текущее" : "Увидят все записавшиеся"}</span><span>{text.length} / 1000</span>
          </div>
          {(announce.error?.detail || clear.error?.detail) && <Warning className="py-2">{announce.error?.detail ?? clear.error?.detail}</Warning>}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!text.trim() || announce.isPending}
              onClick={() => selected && announce.mutate({ id: selected, data: { text: text.trim() } }, { onSuccess: () => { setText(""); refresh(); } })}>
              <Megaphone className="size-4" />Опубликовать
            </Button>
            {current && (
              <Button variant="soft" rough={{ color: "var(--orange)" }} className="text-orange-ink" disabled={clear.isPending}
                onClick={() => selected && clear.mutate({ id: selected }, { onSuccess: refresh })}>
                Снять текущее
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-[18px] bg-background p-3">
          <p className={LABEL}>Так увидят участники</p>
          <div className="flex flex-col gap-2 rounded-[14px] border-2 border-ink bg-card p-3">
            <span className="text-[13px] font-extrabold text-foreground">{title}</span>
            {shown ? (
              <div className="rounded-[10px] border-[1.5px] border-ink bg-sun p-2.5">
                <p className="flex items-center gap-1 text-[9px] font-extrabold tracking-[1px]"><Megaphone className="size-3" />ОБЪЯВЛЕНИЕ · {text.trim() ? "ЧЕРНОВИК" : "СЕЙЧАС"}</p>
                <p className="mt-1 text-xs font-bold whitespace-pre-line text-foreground">{shown}</p>
              </div>
            ) : (
              <p className="text-xs font-medium text-muted-foreground">Объявления нет.</p>
            )}
            <span className="h-2 w-4/5 rounded-full bg-track" />
            <span className="h-2 w-3/5 rounded-full bg-track" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** «Организация месяца»: поздравление победителю, иначе — как ей стать. */
function AwardCard() {
  const me = useOrganizationsMe({ query: { retry: false } });
  const featured = useOrganizationsFeatured();
  const org = me.data?.status === 200 ? me.data.data : undefined;
  const top = featured.data?.status === 200 ? featured.data.data : undefined;
  const won = !!org?.id && top?.id === org.id;
  return (
    <section className={cn(CARD, "relative flex flex-col gap-3 overflow-hidden p-6", won ? "bg-secondary" : "bg-lavender-soft")}>
      <span aria-hidden className="absolute top-5 right-10 size-9 rounded-full border-[3px] border-primary" />
      <motion.span animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4 }}
        className="flex size-14 items-center justify-center rounded-[16px] border-2 border-ink bg-card shadow-hard-sm">
        <Trophy className="size-7" strokeWidth={2.2} />
      </motion.span>
      {won && top ? (
        <>
          <Chip tone="bg-ink" className="self-start text-[10px] text-secondary">{top.period.slice(0, 7)}</Chip>
          <h2 className="font-display text-[26px] leading-8 font-extrabold text-foreground">Вы — организация месяца!</h2>
          <p className="text-[13px] font-bold text-foreground">Бейдж уже на публичной странице клуба и в ленте.</p>
          <Button asChild variant="ink" rough={false} className="self-start shadow-none">
            <Link to={`/orgs/${org!.id}`}><ArrowUpRight className="size-4" />Открыть страницу</Link>
          </Button>
        </>
      ) : (
        <>
          <h2 className="font-display text-[22px] leading-7 font-extrabold text-foreground">Стать организацией месяца</h2>
          <p className="text-[13px] font-bold text-foreground">Счёт за месяц: пришедшие участники ×3 и вернувшиеся ×5. Проводите встречи — и бейдж появится на странице клуба.</p>
          {org?.status === "APPROVED" && org.id && (
            <Button asChild variant="outline" rough={false} className="self-start shadow-none">
              <Link to={`/orgs/${org.id}`}><ArrowUpRight className="size-4" />Страница клуба</Link>
            </Button>
          )}
        </>
      )}
    </section>
  );
}

/** Главная организатора (клуб): ближайшее занятие, неделя, входящие, мероприятия и объявление. */
export function OrganizerHome() {
  const m = useOrganizerHome();
  const me = useOrganizationsMe({ query: { retry: false } });
  const orgName = me.data?.status === 200 ? me.data.data.name : undefined;
  const [tab, setTab] = useState<"UPCOMING" | "PAST">("UPCOMING");
  const list = tab === "UPCOMING" ? m.events : m.pastEvents;
  const unreadCounts = useNotificationsUnreadCounts();
  const unread = (unreadCounts.data?.status === 200 ? unreadCounts.data.data : []).reduce((s, c) => s + c.unread, 0);
  const weekLoad = Array.from({ length: 7 }, (_, i) => {
    const day = startOfDay(new Date()).getTime() + i * 86_400_000;
    return m.week.filter((s) => s.occurrence.status === "SCHEDULED" && startOfDay(new Date(s.occurrence.startAt)).getTime() === day)
      .reduce((sum, s) => sum + s.occurrence.attendeesCount, 0);
  });
  const maxLoad = Math.max(1, ...weekLoad);

  if (m.isLoading) return <p className="text-base font-bold text-muted-foreground">Загружаем…</p>;

  return (
    <div className="flex w-full flex-col gap-6">
      <Hero slot={m.next} orgName={orgName} />
      <BublikHint busiest={m.busiest} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Pulse label="Занятий на неделе" value={m.weekCount} hint={m.weekSeries ? `из ${m.weekSeries} ${plural(m.weekSeries, ["серии", "серий", "серий"])}` : "впереди"} />
        <Pulse label="Придут за неделю" value={m.weekAttendees} hint="отметились">
          <div className="flex h-6 items-end gap-1">
            {weekLoad.map((n, i) => (
              <span key={i} className={cn("w-full rounded-[3px]", n ? "bg-primary" : "bg-track")} style={{ height: `${Math.max(12, (n / maxLoad) * 100)}%` }} />
            ))}
          </div>
        </Pulse>
        <Pulse label="Заявки ждут" value={m.pendingTotal} hint="на решение" tone={m.pendingTotal ? "bg-peach" : "bg-card"}>
          {m.busiest && <Chip tone="bg-card" className="max-w-full self-start px-2 py-px text-[10px] normal-case"><span className="truncate">{m.busiest.event.title}</span></Chip>}
        </Pulse>
        <Pulse label="Непрочитанное" value={unread} hint={plural(unread, ["уведомление", "уведомления", "уведомлений"])}>
          <Link to="/activity" className="self-start text-xs font-extrabold text-primary hover:underline">Открыть активность</Link>
        </Pulse>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Week week={m.week} series={m.series} />
        <Inbox />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[26px] leading-8 font-extrabold text-foreground">Мои мероприятия</h2>
        <div className="flex items-center gap-4">
          <PillTabs value={tab} onChange={setTab} tabs={[{ key: "UPCOMING", label: "Ближайшие" }, { key: "PAST", label: "Прошедшие" }]} />
          <Link to="/my/events" className="flex items-center gap-1 text-[13px] font-extrabold text-foreground hover:underline">
            Все в кабинете <ArrowRight className="size-3.5" strokeWidth={2.6} />
          </Link>
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={CalendarPlus} tone="bg-secondary" title={tab === "UPCOMING" ? "Ближайших мероприятий нет" : "Прошедших пока нет"}
          text="Создайте встречу — укажите вид спорта, время и место."
          action={<Button asChild><Link to="/events/new">Создать событие</Link></Button>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.slice(0, 3).map((e, i) => <MyEventCard key={e.id} e={e} pending={m.pendingByEvent[e.id] ?? 0} index={i} />)}
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Announce events={m.events} />
        <AwardCard />
      </div>
    </div>
  );
}
