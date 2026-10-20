import { CalendarClock, Ticket } from "lucide-react";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Link } from "react-router";
import { useRegistrationsMine } from "@/shared/api/generated/core/registrations/registrations";
import { useUsersHistorySummary } from "@/shared/api/generated/core/users/users";
import { Card } from "@/shared/components/ui/card";
import { cn } from "cn";
import { visitsWord } from "./use-attendance";
import { SPORT_LEVEL_LABEL, whenLabel } from "./passport-utils";
import { usePublicProfile, type PublicProfile } from "../model/public-profile";

/** Цвета полос по видам спорта: чаще всего — синий, дальше по кругу. */
const BARS = ["bg-primary", "bg-green", "bg-accent", "bg-ink"];

const REG_TONES = {
  PENDING: { box: "bg-peach", badge: "border-accent text-accent", text: "ЖДЁТ ОРГАНИЗАТОРА" },
  CONFIRMED: { box: "bg-sky-soft", badge: "border-primary text-primary", text: "ПОДТВЕРЖДЕНО" },
} as const;

// Карточка занимает остаток правой колонки под «Посещено»; размеры внутри в px: не растут от шрифта браузера.
const CARD = "min-h-0 flex-1 gap-[14px] overflow-hidden rounded-[24px] p-5";

/** История посещений: всего, по видам спорта и ближайшие записи. В чужом профиле — его данные без записей. */
export function HistoryCard() {
  const owner = usePublicProfile();
  return owner ? <PublicHistory owner={owner} /> : <MyHistory />;
}

function Head({ total }: { total: number }) {
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 font-bold whitespace-nowrap">
        <h2 className="font-display text-[22px] text-foreground">История</h2>
        <span className="text-[13px] text-muted-foreground">
          <span className="font-display text-[18px] leading-[28px] font-extrabold text-foreground">{total}</span> {visitsWord(total)} за всё время
        </span>
      </div>
    </>
  );
}

/** Чужая история: число посещений, виды спорта с уровнем и события, которые человек ведёт. */
function PublicHistory({ owner }: { owner: PublicProfile }) {
  const { user } = owner;
  const events = user.events.slice(0, 3);
  return (
    <Card className={CARD}>
      <Head total={user.attendedCount} />

      <ul className="flex flex-col gap-[10px]" aria-label="Виды спорта">
        {user.sports.length === 0 ? (
          <li className="text-[14px] leading-[20px] font-semibold text-muted-foreground">Виды спорта пока не выбраны.</li>
        ) : (
          user.sports.slice(0, 3).map((s, i) => (
            <li key={s.sport.id} className="flex items-center gap-[12px]">
              <span className={cn("size-[14px] shrink-0 rounded-full border-[1.5px] border-ink", BARS[i % BARS.length])} />
              <span className="min-w-0 truncate text-[14px] leading-[20px] font-extrabold text-foreground">{s.sport.name}</span>
              {s.level && (
                <span className="ml-auto text-[14px] leading-[20px] font-bold whitespace-nowrap text-muted-foreground">
                  {SPORT_LEVEL_LABEL[s.level]}
                </span>
              )}
            </li>
          ))
        )}
      </ul>

      <div className="h-[2px] w-full shrink-0 bg-track" />

      <p className="text-[10px] font-extrabold tracking-[1.2px] whitespace-nowrap text-muted-foreground">
        СКОРО · ВЕДЁТ СОБЫТИЯ
      </p>

      {events.length === 0 ? (
        <EmptyState size="sm" icon={CalendarClock} tone="bg-sky" title="Ближайших событий нет" />
      ) : (
        events.map((e) => (
          <Link
            key={e.id}
            to={`/events/${e.id}`}
            className="flex flex-col gap-[6px] rounded-2xl border-[1.5px] border-ink bg-sky-soft px-[14px] py-[12px]"
          >
            <span className="flex items-center justify-between gap-[8px]">
              <span className="truncate text-[14px] leading-[20px] font-extrabold text-foreground">{e.title}</span>
              <span className="shrink-0 rounded-pill border-[1.5px] border-primary bg-card px-[8px] py-[3px] text-[9px] font-extrabold tracking-[1px] whitespace-nowrap text-primary">
                {e.sport.name.toUpperCase()}
              </span>
            </span>
            <span className="truncate text-[12px] leading-[16px] font-medium text-muted-foreground">
              {[whenLabel(e.startAt), e.address ?? e.locationNote].filter(Boolean).join(" · ")}
            </span>
          </Link>
        ))
      )}
    </Card>
  );
}

function MyHistory() {
  const summary = useUsersHistorySummary({});
  const mine = useRegistrationsMine();

  const data = summary.data?.status === 200 ? summary.data.data : undefined;
  const total = data?.total ?? 0;
  const sports = (data?.bySport ?? []).slice(0, 3);
  const max = Math.max(1, ...sports.map((s) => s.count));

  const upcoming = (mine.data?.status === 200 ? (mine.data.data.items ?? []) : [])
    .filter((r) => r.status === "PENDING" || r.status === "CONFIRMED")
    .filter((r) => r.event.status === "PUBLISHED" && !r.event.cancelledByOrganizer)
    .filter((r) => new Date(r.myNextOccurrence?.startAt ?? r.event.startAt).getTime() > Date.now())
    .sort(
      (a, b) =>
        new Date(a.myNextOccurrence?.startAt ?? a.event.startAt).getTime() -
        new Date(b.myNextOccurrence?.startAt ?? b.event.startAt).getTime(),
    )
    .slice(0, 3);

  return (
    <Card className={CARD}>
      <Head total={total} />

      <ul className="flex flex-col gap-[10px]" aria-label="Посещения по видам спорта">
        {sports.length === 0 ? (
          <li className="text-[14px] leading-[20px] font-semibold text-muted-foreground">
            Посещений пока нет. После первого занятия здесь появится статистика по видам спорта.
          </li>
        ) : (
          sports.map((s, i) => (
            <li key={s.sport.id} className="flex items-center gap-[12px]">
              <span className="w-[70px] shrink-0 truncate text-[14px] leading-[20px] font-extrabold text-foreground" title={s.sport.name}>
                {s.sport.name}
              </span>
              <span className="h-[14px] min-w-0 flex-1 overflow-hidden rounded-full border-[1.5px] border-ink bg-lilac/30">
                <span
                  className={cn("block h-full", BARS[i % BARS.length])}
                  style={{ width: `${Math.max((s.count / max) * 100, 6)}%` }}
                />
              </span>
              <span className="text-[14px] leading-[20px] font-extrabold whitespace-nowrap text-foreground">×{s.count}</span>
            </li>
          ))
        )}
      </ul>

      <div className="h-[2px] w-full shrink-0 bg-track" />

      <p className="text-[10px] font-extrabold tracking-[1.2px] whitespace-nowrap text-muted-foreground">
        СКОРО · МОИ ЗАПИСИ
      </p>

      {upcoming.length === 0 ? (
        <EmptyState size="sm" icon={Ticket} tone="bg-accent" title="Ближайших записей нет"
          text={<>Запишитесь на первое мероприятие — <Link to="/feed" className="text-primary underline underline-offset-4">найти событие</Link></>} />
      ) : (
        upcoming.map((r) => {
          const tone = REG_TONES[r.status as keyof typeof REG_TONES];
          const place = r.event.address ?? r.event.locationNote;
          return (
            <Link
              key={r.id}
              to={`/events/${r.event.id}`}
              className={cn(
                "flex flex-col gap-[6px] rounded-2xl border-[1.5px] border-ink px-[14px] py-[12px]",
                tone.box,
              )}
            >
              <span className="flex items-center justify-between gap-[8px]">
                <span className="truncate text-[14px] leading-[20px] font-extrabold text-foreground">{r.event.title}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-pill border-[1.5px] bg-card px-[8px] py-[3px] text-[9px] font-extrabold tracking-[1px] whitespace-nowrap",
                    tone.badge,
                  )}
                >
                  {tone.text}
                </span>
              </span>
              <span className="truncate text-[12px] leading-[16px] font-medium text-muted-foreground">
                {[whenLabel(r.myNextOccurrence?.startAt ?? r.event.startAt), place].filter(Boolean).join(" · ")}
              </span>
            </Link>
          );
        })
      )}
    </Card>
  );
}
