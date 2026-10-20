import { profilePath } from "@/entity/user/lib/profile-path";
import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Check, Clock, EyeOff, Plus, RotateCcw, Shirt, Trophy } from "lucide-react";
import { cn } from "cn";
import {
  useAdminConfirmAward,
  useAdminListAwards,
  useAdminListEvents,
  useAdminListOrganizations,
  useAdminListPetItems,
  useAdminListUsers,
  useAdminStats,
} from "@/shared/api/generated/core/admin/admin";
import type { AdminOrganizationResponse, AwardCandidateResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { MyBeaverBadge } from "@/widgets/beaver-pet/ui/my-beaver-badge";
import { ago } from "@/pages/cabinet/model/format";
import { SignupsChart } from "@/pages/admin/ui/overview-page";
import { ModerationDialogs, type Action } from "@/pages/admin/ui/events-page";
import { Chip, Consequence, DecisionDialog, LetterTile, PillTabs, useInvalidateAdmin } from "@/pages/admin/ui/parts";
import { monthTitle } from "@/pages/admin/ui/format";
import { MemphisGlyph } from "@/shared/components/ui/memphis-background";

const CARD = "rounded-[24px] border-2 border-ink bg-card";
const TITLE = "font-display text-[22px] leading-7 font-extrabold text-foreground";
const LABEL = "text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase";
const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const num = (n: number) => n.toLocaleString("ru-RU");
const plural = (n: number, forms: [string, string, string]) => {
  const m10 = n % 10, m100 = n % 100;
  return forms[m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2];
};
/** Сколько дней заявка ждёт решения. */
const waitDays = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : 0);
const waitLabel = (d: number) => (d === 0 ? "сегодня" : `${d} ${plural(d, ["день", "дня", "дней"])}`);

function useOrgCount(status: "PENDING" | "REVISION" | "REJECTED" | "APPROVED") {
  const q = useAdminListOrganizations({ status, size: 1 });
  return q.data?.status === 200 ? q.data.data.totalElements ?? 0 : 0;
}

/** Очередь заявок: сначала старые (API отдаёт новые сверху — переворачиваем). */
function usePendingQueue() {
  const q = useAdminListOrganizations({ status: "PENDING", size: 50 });
  const items = q.data?.status === 200 ? q.data.data.items ?? [] : [];
  return [...items].sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
}

/** Светлые линии и ультрамариновая тень: на чернильном фоне героя обычный инвентарь с чернильной обводкой сливается. */
const ON_DARK = { ink: "var(--paper)", shadow: "var(--primary)" } as const

function HeroDecor() {
  return (
    // инвентарь расставлен под две колонки героя, в зазоре между текстом и веером заявок; в одной колонке он лёг бы на заголовок
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
      <span className="absolute top-6 left-[49%] size-9 rotate-[18deg]"><MemphisGlyph shape="shuttlecock" color="var(--sky)" {...ON_DARK} /></span>
      <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-14 left-[57%] size-9">
        <MemphisGlyph shape="tennis" color="var(--secondary)" {...ON_DARK} />
      </motion.span>
      <motion.span animate={{ rotate: [0, 14, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-[140px] left-[53%] size-12">
        <MemphisGlyph shape="whistle" color="var(--accent)" {...ON_DARK} />
      </motion.span>
      <span className="absolute bottom-9 left-[51%] size-10"><MemphisGlyph shape="football" color="var(--ink)" {...ON_DARK} /></span>
      <span className="absolute bottom-[86px] left-[60%] size-12 -rotate-12"><MemphisGlyph shape="dumbbell" color="var(--mint)" {...ON_DARK} /></span>
    </div>
  );
}

/** Веер карточек заявок справа в герое: верхняя — самая старая. */
function QueueFan({ queue }: { queue: AdminOrganizationResponse[] }) {
  const top = queue.slice(0, 3);
  if (top.length === 0) {
    return (
      <div className="relative flex h-[180px] items-center justify-center rounded-[22px] border-2 border-dashed border-white/30 px-6 text-center text-sm font-bold text-white/70">
        Очередь пуста — все заявки разобраны
      </div>
    );
  }
  return (
    <div className="relative h-[220px] w-full max-w-[340px] justify-self-end">
      {top.slice().reverse().map((o, ri) => {
        const i = top.length - 1 - ri;
        return (
          <motion.div key={o.id}
            initial={{ opacity: 0, y: 20, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: i === 0 ? 0 : -3 * i }}
            whileHover={i === 0 ? { y: -4 } : undefined}
            transition={{ type: "spring", stiffness: 220, damping: 20, delay: ri * 0.08 }}
            className="absolute right-0 left-0 flex flex-col gap-3 rounded-[20px] border-2 border-ink bg-card p-4 shadow-hard"
            style={{ top: 70 - i * 34, zIndex: 10 - i, transformOrigin: "bottom left" }}>
            <div className="flex items-center gap-3">
              <LetterTile name={o.name} logoUrl={o.logoUrl} className="size-10" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-extrabold text-foreground">{o.name}</span>
                <span className="truncate text-xs font-medium text-muted-foreground">{o.city ?? "Город не указан"}</span>
              </div>
            </div>
            {i === 0 && (
              <div className="flex items-center justify-between gap-2">
                <Chip tone="bg-salmon" className="gap-1 px-2 py-px text-[10px] normal-case"><Clock className="size-3" strokeWidth={2.6} />ждёт {waitLabel(waitDays(o.submittedAt))}</Chip>
                <Button asChild variant="secondary" size="sm" className="h-8 text-xs"><Link to={`/admin/organizations/${o.id}`}>Проверить</Link></Button>
              </div>
            )}
          </motion.div>
        );
      })}
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.3 }}
        className="absolute top-[36px] -right-3 z-20 flex size-11 items-center justify-center rounded-full border-2 border-ink bg-accent font-display text-lg font-extrabold text-white">
        {queue.length}
      </motion.span>
    </div>
  );
}

/** Маленький график-линия регистраций для карточки «Пользователи». */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 180},${36 - (v / max) * 32}`);
  const [lx, ly] = pts[pts.length - 1].split(",");
  return (
    <svg viewBox="0 0 186 40" className="h-10 w-full" aria-hidden>
      <motion.polyline initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeOut" }}
        points={pts.join(" ")} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="4.5" fill="var(--lime)" stroke="var(--ink)" strokeWidth="2" />
    </svg>
  );
}

/** Полоска из долей: допущены / ждут / доработка / отказ. */
function StackBar({ parts }: { parts: { value: number; tone: string }[] }) {
  const total = Math.max(1, parts.reduce((s, p) => s + p.value, 0));
  return (
    <div className="flex h-3 overflow-hidden rounded-full border-2 border-ink bg-card">
      {parts.map((p, i) => p.value > 0 && (
        <motion.span key={i} initial={{ width: 0 }} animate={{ width: `${(p.value / total) * 100}%` }} transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.1 }}
          className={cn("h-full", p.tone, i > 0 && "border-l-[1.5px] border-ink")} />
      ))}
    </div>
  );
}

function Legend({ items }: { items: { label: string; tone: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
      {items.map((i) => <span key={i.label} className="flex items-center gap-1"><span className={cn("size-2.5 rounded-full border-[1.5px]", i.tone)} />{i.label}</span>)}
    </div>
  );
}

/** Пьедестал «Организации месяца»: тройка лидеров, остальные строкой ниже. */
function Podium({ candidates }: { candidates: AwardCandidateResponse[] }) {
  const [first, second, third] = candidates;
  const step = (c: AwardCandidateResponse | undefined, place: number, height: string, tone: string, delay: number) => c && (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <LetterTile name={c.organizationName} className={place === 1 ? "size-12 bg-secondary text-xl" : "size-10"} />
      <span className="line-clamp-2 text-center text-[13px] font-extrabold text-foreground">{c.organizationName}</span>
      <motion.div initial={{ height: 0 }} whileInView={{ height }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 120, damping: 16, delay }}
        className={cn("flex w-full flex-col items-center overflow-hidden rounded-t-[16px] border-2 border-b-0 border-ink pt-3", tone)}>
        <span className="font-display text-[32px] leading-9 font-extrabold text-foreground">{place}</span>
        <span className="text-xs font-bold text-foreground">{c.score} очков</span>
      </motion.div>
    </div>
  );
  return (
    <div className="flex items-end gap-3 rounded-[18px] bg-background px-4 pt-6">
      {step(second, 2, "110px", "bg-lavender-soft", 0.15)}
      {step(first, 1, "150px", "bg-secondary", 0)}
      {step(third, 3, "80px", "bg-peach", 0.3)}
    </div>
  );
}

/** Главная админа: что ждёт решения сегодня, здоровье платформы, очередь, награда, свежие мероприятия. */
export function AdminHome() {
  const [period, setPeriod] = useState<"7" | "30" | "90" | "366">("30");
  const stats = useAdminStats({ days: Number(period) });
  const month = useAdminStats({ days: 30 });
  const data = stats.data?.status === 200 ? stats.data.data : undefined;
  const monthData = month.data?.status === 200 ? month.data.data : undefined;
  const queue = usePendingQueue();
  const revision = useOrgCount("REVISION");
  const rejected = useOrgCount("REJECTED");
  const awards = useAdminListAwards();
  const awardData = awards.data?.status === 200 ? awards.data.data : undefined;
  const award = awardData?.award;
  const proposed = award?.status === "PROPOSED";
  const events = useAdminListEvents({ size: 5 });
  const fresh = events.data?.status === 200 ? events.data.data.items ?? [] : [];
  const totalEvents = events.data?.status === 200 ? events.data.data.totalElements ?? 0 : 0;
  const users = useAdminListUsers({ size: 3 });
  const newcomers = users.data?.status === 200 ? users.data.data.items ?? [] : [];
  const pets = useAdminListPetItems();
  const items = pets.data?.status === 200 ? pets.data.data : [];
  const [action, setAction] = useState<Action>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirm = useAdminConfirmAward();
  const invalidate = useInvalidateAdmin();

  const today = new Date();
  const unpublished = monthData?.eventsUnpublished ?? 0;
  const decisions = queue.length + (proposed ? 1 : 0);
  const signups30 = monthData?.signupsByDay.reduce((s, d) => s + d.count, 0) ?? 0;
  const periodTotal = data?.signupsByDay.reduce((s, d) => s + d.count, 0) ?? 0;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Герой: сколько решений ждут */}
      <section className="relative grid grid-cols-1 items-center gap-8 overflow-hidden rounded-[28px] border-2 border-ink bg-ink p-6 text-white sm:p-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <HeroDecor />
        <div className="relative flex min-w-0 flex-col gap-4">
          <p className="text-[13px] font-bold text-secondary">Админка · {WEEKDAYS[today.getDay()]}, {today.getDate()} {MONTHS[today.getMonth()]}</p>
          <h1 className="max-w-[520px] font-display text-[38px] leading-[44px] font-extrabold sm:text-[44px] sm:leading-[50px]">
            {decisions > 0 ? `${decisions} ${plural(decisions, ["решение ждёт", "решения ждут", "решений ждут"])} тебя сегодня` : "Все решения приняты — можно выдохнуть"}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Chip tone="bg-peach" className="text-[11px] normal-case">Заявки организаций · {queue.length}</Chip>
            {proposed && <Chip tone="bg-secondary" className="gap-1 text-[11px] normal-case"><Trophy className="size-3" />Организация месяца · 1</Chip>}
            <Chip tone="bg-card" className="text-[11px] normal-case">Снято · {unpublished}</Chip>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button asChild variant="secondary" size="lg">
              <Link to={queue[0] ? `/admin/organizations/${queue[0].id}` : "/admin/organizations"}><Check className="size-4" strokeWidth={3} />Разобрать очередь</Link>
            </Button>
            <Button asChild variant="clear" size="lg">
              <Link to="/admin/events"><EyeOff className="size-4" />Модерация мероприятий</Link>
            </Button>
          </div>
        </div>
        <QueueFan queue={queue} />
      </section>

      {/* Бублик: награда ждёт подтверждения */}
      {proposed && award && (
        <section className="relative flex flex-wrap items-center gap-4 rounded-[24px] border-2 border-ink bg-lime-soft py-5 pr-5 pl-5 sm:pl-[140px]">
          <MyBeaverBadge className="absolute top-[-18px] left-3 hidden h-[110px] w-[120px] sm:block" />
          <div className="min-w-[min(100%,260px)] flex-1">
            <p className={LABEL}>Бублик подсказывает</p>
            <p className="mt-1 font-display text-[17px] leading-[22px] font-bold text-foreground">
              За {monthTitle(award.period).split(" ")[0].toLowerCase()} предложена «Организация месяца»: {award.organizationName}, {award.score} очков
            </p>
          </div>
          <Button variant="ink" rough={false} className="shadow-none" onClick={() => setConfirmOpen(true)}><Check className="size-4" strokeWidth={3} />Подтвердить</Button>
          <Button asChild variant="outline" rough={false} className="shadow-none"><Link to="/admin/awards">Кандидаты</Link></Button>
        </section>
      )}

      {/* Здоровье платформы */}
      {monthData && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={cn(CARD, "flex flex-col gap-2 px-5 py-4")}>
            <p className={LABEL}>Пользователи</p>
            <p className="flex items-baseline gap-2"><span className="font-display text-[32px] leading-9 font-extrabold">{num(monthData.users)}</span><span className="text-xs font-medium text-muted-foreground">всего</span></p>
            <Sparkline values={monthData.signupsByDay.map((d) => d.count)} />
            <Chip tone="bg-secondary" className="self-start text-[10px] normal-case">+{signups30} за 30 дней</Chip>
          </div>
          <div className={cn(CARD, "flex flex-col gap-2.5 px-5 py-4")}>
            <p className={LABEL}>Организации</p>
            <p className="flex items-baseline gap-2"><span className="font-display text-[32px] leading-9 font-extrabold">{num(monthData.organizationsApproved)}</span><span className="text-xs font-medium text-muted-foreground">допущено</span></p>
            <StackBar parts={[
              { value: monthData.organizationsApproved, tone: "bg-secondary" },
              { value: monthData.organizationsPending, tone: "bg-peach" },
              { value: revision, tone: "bg-sky-soft" },
              { value: rejected, tone: "bg-salmon" },
            ]} />
            <Legend items={[
              { label: `ждут ${monthData.organizationsPending}`, tone: "border-orange bg-peach" },
              { label: `доработка ${revision}`, tone: "border-primary bg-sky-soft" },
              { label: `отказ ${rejected}`, tone: "border-orange-ink bg-salmon" },
            ]} />
          </div>
          <div className={cn(CARD, "flex flex-col gap-2.5 px-5 py-4")}>
            <p className={LABEL}>Мероприятия</p>
            <p className="flex items-baseline gap-2"><span className="font-display text-[32px] leading-9 font-extrabold">{num(monthData.eventsPublished)}</span><span className="text-xs font-medium text-muted-foreground">опубликовано</span></p>
            <StackBar parts={[
              { value: monthData.eventsPublished, tone: "bg-primary" },
              { value: monthData.eventsUnpublished, tone: "bg-peach" },
              { value: monthData.eventsDeleted, tone: "bg-salmon" },
            ]} />
            <Legend items={[
              { label: `снято ${monthData.eventsUnpublished}`, tone: "border-orange bg-peach" },
              { label: `удалено ${monthData.eventsDeleted}`, tone: "border-orange-ink bg-salmon" },
            ]} />
          </div>
          <div className={cn(CARD, "flex flex-col gap-2 px-5 py-4")}>
            <p className={LABEL}>Записи</p>
            <p className="flex items-baseline gap-2"><span className="font-display text-[32px] leading-9 font-extrabold">{num(monthData.registrationsConfirmed)}</span><span className="text-xs font-medium text-muted-foreground">подтверждено</span></p>
            <Chip tone="bg-peach" className="self-start text-[10px] normal-case">{num(monthData.registrationsPending)} ждут организаторов</Chip>
            <Chip tone="bg-sky-soft" className="self-start text-[10px] normal-case">{num(monthData.comments)} сообщений</Chip>
          </div>
        </div>
      )}

      {/* График и очередь */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className={cn(CARD, "flex min-w-0 flex-col gap-3 p-5 sm:p-6")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={TITLE}>Новые пользователи</h2>
              <p className="text-xs font-medium text-muted-foreground">Регистрации по дням</p>
            </div>
            <div className="flex items-center gap-2">
              <Chip tone="bg-secondary" className="text-[10px] normal-case">{num(periodTotal)} за {period} дней</Chip>
              <PillTabs value={period} onChange={setPeriod} tabs={(["7", "30", "90", "366"] as const).map((p) => ({ key: p, label: p }))} />
            </div>
          </div>
          {data ? <SignupsChart days={data.signupsByDay} average /> : <p className="text-sm font-bold text-muted-foreground">Загружаем…</p>}
          <p className="text-[11px] font-medium text-muted-foreground">Дни без регистраций приходят нулями. Пиковый день подсвечен.</p>
        </section>

        <section className={cn(CARD, "flex flex-col gap-3 p-5 sm:p-6")}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={TITLE}>Очередь заявок</h2>
            <Chip tone="bg-lavender-soft" className="text-[10px] normal-case">сначала старые</Chip>
          </div>
          {queue.length === 0 ? (
            <EmptyState size="sm" icon={Check} tone="bg-secondary" title="Очередь пуста" text="Новые заявки клубов появятся здесь." />
          ) : (
            <div className="flex flex-col">
              {queue.slice(0, 5).map((o) => {
                const d = waitDays(o.submittedAt);
                return (
                  <Link key={o.id} to={`/admin/organizations/${o.id}`} className="flex items-center gap-3 border-b-[1.5px] border-track py-2.5 transition-colors last:border-0 hover:bg-background">
                    <LetterTile name={o.name} logoUrl={o.logoUrl} className="size-10" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-extrabold text-foreground">{o.name}</span>
                      <span className="truncate text-xs font-medium text-muted-foreground">{[o.city, o.sports?.[0]?.name].filter(Boolean).join(" · ")}</span>
                    </span>
                    <Chip tone={d >= 2 ? "bg-salmon" : d === 0 ? "bg-secondary" : "bg-card"} className="gap-1 px-2 py-px text-[10px] normal-case">
                      <Clock className="size-3" strokeWidth={2.6} />{waitLabel(d)}
                    </Chip>
                  </Link>
                );
              })}
            </div>
          )}
          <Legend items={[{ label: `на доработке ${revision}`, tone: "border-primary bg-card" }, { label: `отказов ${rejected}`, tone: "border-orange bg-card" }]} />
          {queue[0] && (
            <Button asChild className="w-full"><Link to={`/admin/organizations/${queue[0].id}`}>Разобрать по порядку</Link></Button>
          )}
        </section>
      </div>

      {/* Пьедестал и свежие мероприятия */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <section className={cn(CARD, "flex flex-col gap-4 p-5 sm:p-6")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={TITLE}>Организация месяца</h2>
              <p className="text-xs font-medium text-muted-foreground">{awardData ? monthTitle(awardData.period) : ""}{award ? " · предложение системы" : ""}</p>
            </div>
            {award && <Chip tone={proposed ? "bg-peach" : "bg-secondary"} className="text-[10px]">{proposed ? "предложена" : "подтверждена"}</Chip>}
          </div>
          {(awardData?.candidates.length ?? 0) === 0 ? (
            <EmptyState size="sm" icon={Trophy} tone="bg-lavender-soft" title="Кандидатов пока нет" text="Они появятся после первых встреч организаций в этом месяце." />
          ) : (
            <>
              <Podium candidates={awardData!.candidates} />
              {awardData!.candidates.length > 3 && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {awardData!.candidates.slice(3, 5).map((c, i) => (
                    <div key={c.organizationId} className="flex items-center gap-2 rounded-pill border-2 border-track px-3 py-1.5 text-xs font-bold text-foreground">
                      <span className="font-display font-extrabold text-muted-foreground">{i + 4}</span>
                      <span className="min-w-0 flex-1 truncate">{c.organizationName}</span>
                      <span className="text-muted-foreground">{c.score}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {proposed && award ? (
                  <Button variant="ink" rough={false} className="max-w-full shadow-none" onClick={() => setConfirmOpen(true)}>
                    <Check className="size-4" strokeWidth={3} /><span className="truncate">Подтвердить «{award.organizationName}»</span>
                  </Button>
                ) : <Button asChild variant="outline" rough={false} className="shadow-none"><Link to="/admin/awards">Все кандидаты</Link></Button>}
                <span className="text-[11px] font-medium text-muted-foreground">пришли ×3 + вернулись ×5 − 30 за снятое</span>
              </div>
            </>
          )}
        </section>

        <section className={cn(CARD, "flex flex-col gap-2 p-5 sm:p-6")}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={TITLE}>Свежие мероприятия</h2>
            <Link to="/admin/events" className="flex items-center gap-1 text-[13px] font-extrabold text-foreground hover:underline">Все {num(totalEvents)} <ArrowRight className="size-3.5" strokeWidth={2.6} /></Link>
          </div>
          {fresh.map((e) => (
            <div key={e.id} className="flex items-center gap-3 border-b-[1.5px] border-track py-2.5 last:border-0">
              <img src={e.sport.imageUrl} alt="" className="size-10 shrink-0 rounded-[10px] border-2 border-ink bg-sky object-cover" />
              <Link to={`/events/${e.id}`} className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-extrabold text-foreground hover:underline">{e.title}</span>
                <span className="truncate text-xs font-medium text-muted-foreground">
                  {[e.author.firstName, e.author.lastName].filter(Boolean).join(" ")} · {ago(e.createdAt)}
                </span>
              </Link>
              {e.status === "UNPUBLISHED" && <Chip tone="bg-peach" className="px-2 py-px text-[9px]">снято</Chip>}
              {e.status === "DELETED" && <Chip tone="bg-salmon" className="px-2 py-px text-[9px]">удалено</Chip>}
              {e.status === "PUBLISHED" && (
                <Button variant="soft" size="sm" rough={{ color: "var(--orange)" }} className="h-8 text-xs text-orange-ink" onClick={() => setAction({ kind: "unpublish", event: e })}>
                  <EyeOff className="size-3.5" />Снять
                </Button>
              )}
              {e.status === "UNPUBLISHED" && (
                <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={() => setAction({ kind: "restore", event: e })}>
                  <RotateCcw className="size-3.5" />Вернуть
                </Button>
              )}
            </div>
          ))}
          <p className="mt-auto text-[11px] font-medium text-muted-foreground">Причина снятия обязательна: её увидят организатор и записавшиеся.</p>
        </section>
      </div>

      {/* Гардероб и новенькие */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className={cn(CARD, "flex flex-col gap-4 bg-sky-soft p-5 sm:p-6")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className={TITLE}>Гардероб бобра</h2>
              <Chip tone="bg-card" className="text-[10px] normal-case">{items.length} {plural(items.length, ["вещь", "вещи", "вещей"])} от админа</Chip>
            </div>
            <Button asChild variant="secondary"><Link to="/admin/pets"><Plus className="size-4" />Добавить вещь</Link></Button>
          </div>
          <div className="flex flex-wrap gap-3">
            {items.slice(0, 6).map((it) => (
              <Link key={it.id} to="/admin/pets" title={it.label}
                className="flex size-[72px] items-center justify-center rounded-[16px] border-2 border-ink bg-card p-2 transition-transform hover:-translate-y-1">
                {it.art?.svg?.trimStart().startsWith("<svg")
                  ? <img src={`data:image/svg+xml;utf8,${encodeURIComponent(it.art.svg)}`} alt={it.label} className="max-h-full max-w-full" />
                  : <Shirt className="size-8" strokeWidth={2} />}
              </Link>
            ))}
            <Link to="/admin/pets" className="flex size-[72px] flex-col items-center justify-center gap-0.5 rounded-[16px] border-2 border-dashed border-primary text-primary transition-colors hover:bg-card">
              <Plus className="size-5" strokeWidth={2.6} /><span className="text-[9px] font-extrabold">PNG/SVG</span>
            </Link>
          </div>
          <p className="text-xs font-medium text-foreground">
            {items[0] ? `Последняя: «${items[items.length - 1].label}». ` : "Своих вещей пока нет. "}Новая вещь сразу появится в магазине бобра у всех.
          </p>
        </section>

        <section className={cn(CARD, "flex flex-col gap-2 p-5 sm:p-6")}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={TITLE}>Новенькие</h2>
            <Link to="/admin/users" className="flex items-center gap-1 text-[13px] font-extrabold text-foreground hover:underline">Все {num(monthData?.users ?? 0)} <ArrowRight className="size-3.5" strokeWidth={2.6} /></Link>
          </div>
          {newcomers.map((u) => (
            <Link key={u.id} to={profilePath(u)} className="flex items-center gap-3 py-1.5">
              <UserAvatar user={u} className="size-9 shrink-0 rounded-full border-2 border-ink" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-extrabold text-foreground">{[u.firstName, u.lastName].filter(Boolean).join(" ") || u.username}</span>
                <span className="truncate text-xs font-medium text-muted-foreground">@{u.username} · {ago(u.createdAt)}</span>
              </span>
              <Chip tone={u.systemRole === "ORG" ? "bg-lavender-soft" : u.systemRole === "ADMIN" ? "bg-secondary" : "bg-card"} className="px-2 py-px text-[9px]">{u.systemRole}</Chip>
            </Link>
          ))}
        </section>
      </div>

      <ModerationDialogs action={action} onClose={() => setAction(undefined)} />
      {award && (
        <DecisionDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Подтвердить «Организацию месяца»"
          subject={
            <div className="flex items-center gap-3 rounded-[14px] border-2 border-ink bg-secondary px-3.5 py-3">
              <span className="flex size-10 items-center justify-center rounded-[10px] border-2 border-ink bg-card"><Trophy className="size-5" /></span>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-foreground">{award.organizationName}</span>
                <span className="text-xs font-bold text-foreground">{monthTitle(award.period)} · счёт {award.score}</span>
              </div>
            </div>
          }
          confirmLabel="Подтвердить награду" confirmClassName="bg-secondary text-secondary-foreground"
          confirmIcon={<Check className="size-4" strokeWidth={3} />}
          pending={confirm.isPending} error={confirm.error?.detail}
          onConfirm={() => confirm.mutate({ id: award.id }, { onSuccess: () => { setConfirmOpen(false); void invalidate(); } })}>
          <ul className="flex flex-col gap-2">
            <Consequence>Награда появится на публичной странице организации</Consequence>
            <Consequence>Организация попадёт в «Организацию месяца» ленты</Consequence>
          </ul>
        </DecisionDialog>
      )}
    </div>
  );
}
