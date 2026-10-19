import { Link } from "react-router";
import { useRegistrationsMine } from "@/shared/api/generated/core/registrations/registrations";
import { useUsersHistorySummary } from "@/shared/api/generated/core/users/users";
import { Card } from "@/shared/components/ui/card";
import { cn } from "cn";
import { visitsWord } from "./use-attendance";
import { whenLabel } from "./passport-utils";

/** Цвета полос по видам спорта: чаще всего — синий, дальше по кругу. */
const BARS = ["bg-primary", "bg-green", "bg-accent", "bg-ink"];

const REG_TONES = {
  PENDING: { box: "bg-peach", badge: "border-accent text-accent", text: "ЖДЁТ ОРГАНИЗАТОРА" },
  CONFIRMED: { box: "bg-sky-soft", badge: "border-primary text-primary", text: "ПОДТВЕРЖДЕНО" },
} as const;

/** История посещений: всего, по видам спорта и ближайшие записи. */
export function HistoryCard() {
  const summary = useUsersHistorySummary({});
  const mine = useRegistrationsMine();

  const data = summary.data?.status === 200 ? summary.data.data : undefined;
  const total = data?.total ?? 0;
  const sports = (data?.bySport ?? []).slice(0, 4);
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
    .slice(0, 2);

  return (
    <Card className="absolute top-[573px] left-0 h-[626px] w-[495px] gap-[18px] overflow-hidden rounded-[24px] p-[26px]">
      <div className="flex items-center justify-between font-bold whitespace-nowrap">
        <h2 className="font-display text-[22px] text-foreground">История</h2>
        <span className="text-[13px] text-muted-foreground">за всё время</span>
      </div>

      <div className="flex items-end gap-[10px] whitespace-nowrap">
        <span className="font-display text-[56px] leading-[normal] font-extrabold text-foreground">{total}</span>
        <span className="pb-2 text-base font-bold text-muted-foreground">{visitsWord(total)}</span>
      </div>

      <ul className="flex flex-col gap-3" aria-label="Посещения по видам спорта">
        {sports.length === 0 ? (
          <li className="text-sm font-semibold text-muted-foreground">
            Посещений пока нет. После первого занятия здесь появится статистика по видам спорта.
          </li>
        ) : (
          sports.map((s, i) => (
            <li key={s.sport.id} className="flex items-center gap-3">
              <span className="w-[70px] shrink-0 truncate text-sm font-extrabold text-foreground" title={s.sport.name}>
                {s.sport.name}
              </span>
              <span className="h-[14px] min-w-0 flex-1 overflow-hidden rounded-full border-[1.5px] border-ink bg-lilac/30">
                <span
                  className={cn("block h-full", BARS[i % BARS.length])}
                  style={{ width: `${Math.max((s.count / max) * 100, 6)}%` }}
                />
              </span>
              <span className="text-sm font-extrabold whitespace-nowrap text-foreground">×{s.count}</span>
            </li>
          ))
        )}
      </ul>

      <div className="h-[2px] w-full shrink-0 bg-track" />

      <p className="text-[10px] font-extrabold tracking-[1.2px] whitespace-nowrap text-muted-foreground">
        СКОРО · МОИ ЗАПИСИ
      </p>

      {upcoming.length === 0 ? (
        <p className="text-sm font-semibold text-muted-foreground">
          Ближайших записей нет.{" "}
          <Link to="/feed" className="text-primary underline underline-offset-4">
            Найти событие
          </Link>
        </p>
      ) : (
        upcoming.map((r) => {
          const tone = REG_TONES[r.status as keyof typeof REG_TONES];
          const place = r.event.address ?? r.event.locationNote;
          return (
            <Link
              key={r.id}
              to={`/events/${r.event.id}`}
              className={cn(
                "flex flex-col gap-[6px] rounded-2xl border-[1.5px] border-ink px-[14px] py-3",
                tone.box,
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-extrabold text-foreground">{r.event.title}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-pill border-[1.5px] bg-card px-2 py-[3px] text-[9px] font-extrabold tracking-[1px] whitespace-nowrap",
                    tone.badge,
                  )}
                >
                  {tone.text}
                </span>
              </span>
              <span className="truncate text-xs font-medium text-muted-foreground">
                {[whenLabel(r.myNextOccurrence?.startAt ?? r.event.startAt), place].filter(Boolean).join(" · ")}
              </span>
            </Link>
          );
        })
      )}
    </Card>
  );
}
