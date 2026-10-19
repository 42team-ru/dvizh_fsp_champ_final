import { useRef, type PointerEvent } from "react";
import { cn } from "cn";
import {
  DAY, HOUR, dayCaption, eventsWord, dayShort, hhmm, presetRange, snap, startOfDay,
  type Preset, type Selection, type Span,
} from "../lib/timeline";

const SPANS: { value: Span; label: string }[] = [
  { value: 1, label: "24 ч" },
  { value: 3, label: "3 дня" },
  { value: 7, label: "7 дней" },
];
const PRESETS: { value: Preset; label: string }[] = [
  { value: "now", label: "Сейчас" },
  { value: "today", label: "Сегодня" },
  { value: "tomorrow", label: "Завтра" },
  { value: "weekend", label: "Выходные" },
  { value: "week", label: "Неделя" },
];

/** Переключатель-«пилюля» из макета дока. */
function Segmented<T extends string | number>({ options, value, onChange, label }: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 gap-0.5 rounded-pill border-[1.5px] border-ink bg-card p-[3px]">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={cn(
            "rounded-pill px-3 py-[5px] text-xs font-extrabold whitespace-nowrap transition-colors",
            o.value === value ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
          )}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Док под картой: режим «В момент» / «Диапазон», пресеты, окно 24 ч / 3 дня / 7 дней и шкала с гистограммой
 * «сколько событий идёт в каждом часе». Метку (или диапазон) тянут мышью или пальцем, стрелками — с клавиатуры.
 */
export function TimeDock({ now, span, onSpan, selection, onSelect, bars, activeCount, totalCount }: {
  now: number;
  span: Span;
  onSpan: (span: Span) => void;
  selection: Selection;
  onSelect: (selection: Selection, span?: Span) => void;
  bars: number[];
  activeCount: number;
  totalCount: number;
}) {
  const track = useRef<HTMLDivElement>(null);
  const anchor = useRef<number | null>(null);
  const start = startOfDay(now);
  const width = span * DAY;
  const pct = (t: number) => `${Math.min(100, Math.max(0, ((t - start) / width) * 100))}%`;
  const max = Math.max(1, ...bars);

  const timeAt = (clientX: number) => {
    const box = track.current!.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    return snap(start + ratio * width);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = timeAt(e.clientX);
    if (selection.mode === "moment") onSelect({ mode: "moment", at: t, live: false });
    else {
      anchor.current = t;
      onSelect({ mode: "range", from: t, to: t + HOUR });
    }
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const t = timeAt(e.clientX);
    if (selection.mode === "moment") onSelect({ mode: "moment", at: t, live: false });
    else if (anchor.current != null) {
      const a = anchor.current;
      onSelect({ mode: "range", from: Math.min(a, t), to: Math.max(a + HOUR, t) });
    }
  };
  const onUp = () => { anchor.current = null; };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? HOUR : HOUR / 4;
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    if (selection.mode === "moment") onSelect({ mode: "moment", at: selection.at + dir * step, live: false });
    else onSelect({ mode: "range", from: selection.from + dir * step, to: selection.to + dir * step });
  };

  const pickPreset = (p: Preset) => {
    if (p === "now") onSelect({ mode: "moment", at: now, live: true });
    else {
      const r = presetRange(p, now);
      onSelect({ mode: "range", from: r.from, to: r.to, preset: p }, r.span > span ? r.span : undefined);
    }
  };
  const preset: Preset | null = selection.mode === "moment" ? (selection.live ? "now" : null) : selection.preset ?? null;

  const ticks: number[] = [];
  const tickStep = span === 7 ? 6 : 3;
  for (let h = 0; h < span * 24; h += tickStep) ticks.push(start + h * HOUR);

  const at = selection.mode === "moment" ? selection.at : null;
  const isActiveBar = (i: number) => {
    const from = start + i * HOUR;
    return selection.mode === "moment"
      ? selection.at >= from && selection.at < from + HOUR
      : from + HOUR > selection.from && from < selection.to;
  };
  const words = eventsWord;
  const summary = selection.mode === "moment"
    ? `${selection.live ? "Сейчас" : `${dayShort(selection.at)}, ${hhmm(selection.at)}`} идут ${words(activeCount)}`
    : `С ${dayShort(selection.from)} ${hhmm(selection.from)} по ${dayShort(selection.to)} ${hhmm(selection.to)}: ${words(activeCount)}`;

  return (
    <div className="flex flex-col gap-2.5 border-t-2 border-ink bg-card px-4 pt-3.5 pb-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Режим" value={selection.mode}
          options={[{ value: "range", label: "Диапазон" }, { value: "moment", label: "В момент" }]}
          onChange={(mode) => {
            if (mode === selection.mode) return;
            if (mode === "moment") onSelect({ mode: "moment", at: now, live: true });
            else onSelect({ mode: "range", from: snap(now), to: snap(now) + 3 * HOUR });
          }} />
        <span className="hidden h-[22px] w-0.5 bg-track sm:block" />
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.value} type="button" aria-pressed={preset === p.value} onClick={() => pickPreset(p.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-pill border-[1.5px] border-ink px-[11px] py-[5px] text-xs font-extrabold whitespace-nowrap",
                preset === p.value ? "bg-secondary" : "bg-card hover:bg-muted",
              )}>
              {p.value === "now" && <span className="size-2 rounded-full bg-accent" />}
              {p.label}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Segmented label="Окно" value={span} options={SPANS} onChange={onSpan} />
        </div>
      </div>

      <div className="no-scrollbar overflow-x-auto">
        <div
          ref={track}
          role="slider"
          tabIndex={0}
          aria-label={selection.mode === "moment" ? "Момент времени" : "Диапазон времени"}
          aria-valuemin={start}
          aria-valuemax={start + width}
          aria-valuenow={at ?? (selection.mode === "range" ? selection.from : start)}
          aria-valuetext={summary}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onKeyDown={onKey}
          className="relative h-[112px] min-w-[620px] cursor-pointer touch-none outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {/* Дни: подпись сверху, колонка, разделитель. */}
          {Array.from({ length: span }, (_, i) => (
            <div key={i} className="absolute top-0 h-[86px]" style={{ left: `${(i / span) * 100}%`, width: `${100 / span}%` }}>
              <div className={cn("h-5 truncate px-1.5 pt-1 text-[10px] font-extrabold tracking-[1px] whitespace-nowrap text-foreground", i % 2 ? "bg-card" : "bg-paper")}>
                {dayCaption(start + i * DAY, i)}
              </div>
              <div className={cn("mt-0.5 h-16", i % 2 ? "bg-paper/50" : "bg-card")} />
              {i > 0 && <span className="absolute top-0 left-[-1px] h-[86px] w-0.5 bg-track" />}
            </div>
          ))}
          {/* Прошлое затемнено. */}
          <div className="absolute top-[22px] left-0 h-16 bg-ink/[0.07]" style={{ width: pct(now) }} />
          {/* Диапазон. */}
          {selection.mode === "range" && (
            <div className="absolute top-[22px] h-16 border-y-2 border-ink bg-secondary/60"
              style={{ left: pct(selection.from), width: `calc(${pct(selection.to)} - ${pct(selection.from)})` }} />
          )}
          {/* Гистограмма: сколько событий идёт в каждом часе. */}
          <div className="absolute top-[22px] left-0 flex h-16 w-full items-end gap-px px-px pb-1">
            {bars.map((n, i) => {
              const past = start + (i + 1) * HOUR <= now;
              return (
                <span key={i} title={`${hhmm(start + i * HOUR)} — ${words(n)}`}
                  className={cn("min-w-0 flex-1 rounded-[3px]", isActiveBar(i) ? "bg-primary" : past ? "bg-track" : "bg-lilac")}
                  style={{ height: n ? `${Math.max(8, (n / max) * 100)}%` : "5px" }} />
              );
            })}
          </div>
          {/* Часы. */}
          {ticks.map((t, i) => (
            <div key={t} className="absolute top-[86px]" style={{ left: pct(t) }}>
              <span className="block h-1 w-[1.5px] bg-track" />
              <span className={cn("absolute top-2 text-[10px] font-semibold text-muted-foreground", i > 0 && "-translate-x-1/2")}>
                {String(new Date(t).getHours()).padStart(2, "0")}
              </span>
            </div>
          ))}
          {/* Метка момента. */}
          {at != null && (
            <>
              <div className="pointer-events-none absolute top-[17px] h-[74px] w-4 -translate-x-1/2 rounded-[8px] border-2 border-ink bg-accent shadow-hard-sm"
                style={{ left: pct(at) }}>
                <span className="absolute top-6 left-[2px] h-[22px] w-0.5 bg-ink" />
                <span className="absolute top-6 left-2 h-[22px] w-0.5 bg-ink" />
              </div>
              <span className="pointer-events-none absolute top-[92px] -translate-x-1/2 rounded-pill border-[1.5px] border-ink bg-accent px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap text-white"
                style={{ left: pct(at) }}>
                {selection.mode === "moment" && selection.live ? `LIVE ${hhmm(at)}` : hhmm(at)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selection.mode === "moment" && selection.live && (
            <span className="rounded-pill border-[1.5px] border-ink bg-accent px-2.5 py-0.5 text-[10px] font-extrabold text-white">LIVE</span>
          )}
          <p className="text-[13px] font-extrabold text-foreground">{summary}</p>
          <span className="rounded-pill border-[1.5px] border-ink bg-secondary px-2.5 py-0.5 text-[11px] font-extrabold">
            {activeCount} из {totalCount}
          </span>
        </div>
        <p className="text-[11px] font-medium text-muted-foreground">
          {selection.mode === "moment" ? "Тяни метку — посмотришь другое время · «Сейчас» вернёт к часам" : "Выдели время на шкале или выбери пресет"}
        </p>
      </div>
    </div>
  );
}
