import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { TriangleAlert } from "lucide-react";
import { cn } from "cn";
import { useAdminStats } from "@/shared/api/generated/core/admin/admin";
import type { AdminStatsResponse, DailyCountResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { AdminLayout, useAdminAttention } from "./admin-layout";
import { Chip, PageHead, PillTabs } from "./parts";
import { monthTitle } from "./format";

const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const PERIODS = ["7", "30", "90", "366"] as const;
type Period = (typeof PERIODS)[number];

const num = (n: number) => n.toLocaleString("ru-RU");

/** Карточка «требует внимания» с кнопкой перехода. */
function Attention({ tone, title, text, to, action }: { tone: string; title: string; text: string; to: string; action: string }) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-3.5 rounded-[20px] border-2 border-ink px-[18px] py-4", tone)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border-2 border-ink bg-card">
        <TriangleAlert className="size-5 text-orange" strokeWidth={2.4} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[15px] leading-5 font-extrabold text-foreground">{title}</p>
        <p className="text-xs leading-4 font-medium text-muted-foreground">{text}</p>
      </div>
      <Button asChild variant="ink" size="sm" rough={false} className="shrink-0 shadow-none">
        <Link to={to}>{action}</Link>
      </Button>
    </div>
  );
}

function Kpi({ label, value, hint, tone = "bg-card" }: { label: string; value: number; hint: string; tone?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 rounded-[20px] border-2 border-ink px-5 py-[18px]", tone)}>
      <p className="text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase">{label}</p>
      <p className="font-display text-[30px] leading-9 font-extrabold text-foreground">{num(value)}</p>
      <p className="text-xs font-medium text-muted-foreground">{hint}</p>
    </div>
  );
}

const KPIS: { key: keyof Omit<AdminStatsResponse, "signupsByDay">; label: string; hint: string; tone?: string }[] = [
  { key: "users", label: "Пользователи", hint: "люди и организации" },
  { key: "organizationsPending", label: "Заявки организаций", hint: "ждут решения", tone: "bg-peach" },
  { key: "organizationsApproved", label: "Организации допущены", hint: "одобрены администратором" },
  { key: "eventsPublished", label: "Мероприятия", hint: "опубликовано" },
  { key: "eventsUnpublished", label: "Снято с публикации", hint: "видны только организатору" },
  { key: "eventsDeleted", label: "Удалено", hint: "мягкое удаление" },
  { key: "registrationsConfirmed", label: "Записи подтверждены", hint: "участники в мероприятиях" },
  { key: "registrationsPending", label: "Заявки участников", hint: "ждут решения организаторов" },
  { key: "comments", label: "Комментарии", hint: "в обсуждениях" },
];

/** «Красивый» верх шкалы: 10, 20, 30, 50, 100… чтобы подписи были круглыми. */
function niceMax(max: number) {
  const steps = [3, 6, 9, 15, 30, 60, 90, 150, 300, 600, 900, 1500, 3000];
  return steps.find((s) => s >= max) ?? Math.ceil(max / 1000) * 1000;
}

/** Столбики регистраций по дням: старые слева, пик подсвечен лаймом и подписан. */
export function SignupsChart({ days, average }: { days: DailyCountResponse[]; average?: boolean }) {
  const [hover, setHover] = useState<number>();
  const max = niceMax(Math.max(1, ...days.map((d) => d.count)));
  const peak = days.reduce((best, d, i) => (d.count > (days[best]?.count ?? -1) ? i : best), 0);
  const shown = hover ?? peak;
  const label = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}.${m}`;
  };
  // Подписей дат не больше семи, равномерно, последний день всегда подписан.
  const every = Math.max(1, Math.ceil(days.length / 7));
  const ticks = [0, 1, 2, 3].map((i) => Math.round((max / 3) * i));
  return (
    <div className="relative flex h-[244px] w-full pl-9">
      {ticks.map((t, i) => (
        <div key={t} className="absolute right-0 left-9 flex items-center" style={{ bottom: 34 + (i / 3) * 200 }}>
          <span className="absolute -left-9 w-7 text-right text-[10px] font-semibold text-muted-foreground">{t}</span>
          <span className={cn("h-[1.5px] w-full", i === 0 ? "bg-ink" : "bg-track")} />
        </div>
      ))}
      <div className="relative flex h-[200px] w-full items-end gap-[3px] self-end mb-[34px] sm:gap-[5px]">
        {average && days.length > 0 && (() => {
          const avg = days.reduce((s, d) => s + d.count, 0) / days.length;
          return (
            <div className="pointer-events-none absolute inset-x-0 z-[5] border-t-2 border-dashed border-orange" style={{ bottom: `${(avg / max) * 100}%` }}>
              <span className="absolute -top-3 left-1 rounded-pill border-[1.5px] border-ink bg-accent px-2 py-px text-[10px] font-extrabold text-white">
                в среднем {avg.toFixed(1).replace(".", ",")} в день
              </span>
            </div>
          );
        })()}
        {days.map((d, i) => {
          const isPeak = i === peak && d.count > 0;
          return (
            <div
              key={d.date}
              className="relative flex h-full min-w-0 flex-1 items-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(undefined)}
            >
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ type: "spring", stiffness: 180, damping: 20, delay: i * (0.6 / days.length) }}
                style={{ height: `${(d.count / max) * 100}%`, originY: 1 }}
                className={cn(
                  "w-full rounded-[4px]",
                  isPeak ? "border-2 border-ink bg-secondary" : "bg-primary",
                  hover === i && !isPeak && "bg-ink"
                )}
              />
              {i === shown && (
                <span className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-[8px] bg-ink px-[9px] py-[3px] text-[11px] font-extrabold whitespace-nowrap text-white"
                  style={{ bottom: `calc(${(d.count / max) * 100}% + 8px)` }}>
                  {Number(d.date.slice(8))} {MONTHS[Number(d.date.slice(5, 7)) - 1]} · {d.count}
                </span>
              )}
              {(i % every === 0 || i === days.length - 1) && (
                <span className="absolute -bottom-[26px] left-1/2 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap text-muted-foreground">
                  {label(d.date)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Обзор: что требует внимания, счётчики платформы и регистрации по дням. */
export default function AdminOverviewPage() {
  const [period, setPeriod] = useState<Period>("30");
  const stats = useAdminStats({ days: Number(period) });
  const data = stats.data?.status === 200 ? stats.data.data : undefined;
  const { pending, awardWaiting, award } = useAdminAttention();
  const total = data?.signupsByDay.reduce((s, d) => s + d.count, 0) ?? 0;

  return (
    <AdminLayout>
      <PageHead title="Обзор" text="Счётчики платформы и регистрации по дням." />

      {(pending > 0 || awardWaiting) && (
        <div className="flex w-full flex-col gap-4 md:flex-row">
          {pending > 0 && (
            <Attention tone="bg-peach" to="/admin/organizations?status=PENDING" action="Открыть очередь"
              title={`${pending} ${pending % 10 === 1 && pending % 100 !== 11 ? "заявка организации ждёт" : "заявок организаций ждут"} решения`}
              text="Проверьте анкеты и документы" />
          )}
          {awardWaiting && award && (
            <Attention tone="bg-lime-soft" to="/admin/awards" action="К награде"
              title="«Организация месяца» ждёт подтверждения"
              text={`${monthTitle(award.period)} · предложена автоматически`} />
          )}
        </div>
      )}

      {stats.isPending ? (
        <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
      ) : stats.isError || !data ? (
        <p role="alert" className="text-base font-bold text-destructive">Не удалось загрузить счётчики.</p>
      ) : (
        <>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {KPIS.map((k) => (
              <Kpi key={k.key} label={k.label} value={data[k.key]} hint={k.hint} tone={k.tone} />
            ))}
          </div>

          <section className="flex w-full flex-col gap-3.5 rounded-[24px] border-2 border-ink bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-xl font-extrabold text-foreground">Регистрации по дням</h2>
                <p className="text-xs font-medium text-muted-foreground">Старые дни слева. Дни без регистраций остаются нулём.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Chip tone="bg-secondary" className="text-xs normal-case">за {period} дней: {num(total)}</Chip>
                <PillTabs tabs={PERIODS.map((p) => ({ key: p, label: p }))} value={period} onChange={setPeriod} />
              </div>
            </div>
            <SignupsChart days={data.signupsByDay} />
          </section>
        </>
      )}
    </AdminLayout>
  );
}
