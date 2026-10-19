import { Link } from "react-router";
import { Bus, Car, Footprints, type LucideIcon } from "lucide-react";
import { TRAVEL_HOW, useLeaveTip, type LeaveTipModel } from "@/entity/event/model/use-leave-tip";
import type { TravelOptionResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Icon } from "@/shared/components/ui/icon";
import { cn } from "cn";

const ICONS: Record<TravelOptionResponse["mode"], LucideIcon> = { WALK: Footprints, BUS: Bus, CAR: Car, NONE: Footprints };
const LABEL: Record<TravelOptionResponse["mode"], string> = { WALK: "Пешком", BUS: "Автобус", CAR: "Машина", NONE: "" };

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** «в 19:35», «завтра в 19:35», «24 октября в 19:35». */
function at(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (sameDay(date, now)) return `в ${time}`;
  if (sameDay(date, tomorrow)) return `завтра в ${time}`;
  return `${date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} в ${time}`;
}

/** Что сказать и какие кнопки показать: предложение, «напомню», «пора выходить» или ничего. */
function view(m: LeaveTipModel) {
  const { tip, option, remindAt } = m;
  if (!tip || !remindAt || tip.reminder?.status === "DISMISSED") return null;
  const travel = option && option.mode !== "NONE";
  const how = travel ? TRAVEL_HOW[option.mode as keyof typeof TRAVEL_HOW] : "";
  const approx = travel && option.source === "ESTIMATE" ? "примерно " : "";
  const road = travel ? ` — до места ${approx}${option.minutes} мин ${how}` : "";
  if (tip.reminder?.status === "SCHEDULED" && tip.reminder.dueAt) {
    return { state: "scheduled" as const, headline: `Напомню ${at(tip.reminder.dueAt)}${road}` };
  }
  if (tip.reminder?.status === "SENT" || new Date(remindAt).getTime() <= Date.now()) {
    return { state: "now" as const, headline: travel ? `Пора выходить${road}` : `Скоро «${tip.title}» — ${at(tip.startAt)}` };
  }
  const headline = travel
    ? `Выходить ${at(remindAt)}${road}`
    : tip.format === "ONLINE"
      ? `Онлайн-встреча ${at(tip.startAt)} — напомнить за 15 минут?`
      : `Встреча ${at(tip.startAt)} — напомнить за час?`;
  return { state: "offer" as const, headline };
}

/** Чипы «Пешком 32 мин · Автобус 19 мин · Машина 5 мин»; не ходящий транспорт — серый, с причиной. */
function Modes({ m, className }: { m: LeaveTipModel; className?: string }) {
  if (!m.tip || m.tip.estimates.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="radiogroup" aria-label="Как добираться">
      {m.tip.estimates.map((o) => {
        const ModeIcon = ICONS[o.mode];
        const active = m.option?.mode === o.mode;
        return (
          <button key={o.mode} type="button" role="radio" aria-checked={active} disabled={!o.available || m.busy}
            onClick={() => m.pick(o.mode)} title={o.note ?? undefined}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-pill border-2 border-ink px-3 text-[13px] leading-[18px] font-bold whitespace-nowrap",
              active ? "bg-ink text-white" : "bg-card text-foreground hover:bg-muted",
              !o.available && "cursor-not-allowed border-dashed bg-card text-muted-foreground hover:bg-card",
            )}>
            <ModeIcon className="size-4 shrink-0" aria-hidden />
            {LABEL[o.mode]} · {o.available ? `${o.minutes} мин` : "не ходит"}
          </button>
        );
      })}
    </div>
  );
}

/** Пояснение под чипами: номера автобусов или почему транспорт не ходит. */
function Note({ m, className }: { m: LeaveTipModel; className?: string }) {
  const bus = m.tip?.estimates.find((o) => o.mode === "BUS");
  const text = m.option?.mode === "BUS" && bus?.note ? `Автобусы ${bus.note}` : bus && !bus.available && bus.note ? `Автобус: ${bus.note}` : null;
  return text ? <p className={cn("text-[13px] leading-[18px] font-semibold text-muted-foreground", className)}>{text}</p> : null;
}

function Actions({ m, state, className, buttonClassName }: {
  m: LeaveTipModel;
  state: "offer" | "scheduled" | "now";
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <div className={cn("flex gap-[10px]", className)}>
      {state === "offer" && (
        <Button variant="ink" rough disabled={m.busy} onClick={m.remind} className={buttonClassName}>
          <Icon name="icon-bell1" className="size-[18px]" />
          Напомнить
        </Button>
      )}
      {state === "scheduled" && (
        <Button variant="soft" disabled={m.busy} onClick={m.cancel} className={buttonClassName}>Отменить</Button>
      )}
      {state === "now" && m.tip && (
        <Button asChild variant="ink" rough className={buttonClassName}><Link to={`/events/${m.tip.eventId}`}>Открыть встречу</Link></Button>
      )}
      {state !== "scheduled" && (
        <Button variant="soft" rough={false} disabled={m.busy} onClick={m.dismiss} className={buttonClassName}>Не надо</Button>
      )}
    </div>
  );
}

/** «Бублик подсказывает» на главной, компьютер. */
export function LeaveTip() {
  const m = useLeaveTip();
  const v = view(m);
  if (!v) return null;
  return (
    <Card className="relative min-h-[104px] flex-row items-center gap-5 bg-mint-soft py-4 pr-[26px] pl-[152px]">
      <img
        src="/home/wave.png"
        alt=""
        className="pointer-events-none absolute top-[-30px] left-[18px] h-[128px] w-[124px] max-w-none object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
        <Eyebrow>БУБЛИК ПОДСКАЗЫВАЕТ</Eyebrow>
        <p className="font-display text-[18px] leading-[23.5px] font-bold text-foreground">{v.headline}</p>
        {v.state === "offer" && <Modes m={m} className="mt-1" />}
        {v.state === "offer" && <Note m={m} />}
      </div>
      <Actions m={m} state={v.state} className="shrink-0" />
    </Card>
  );
}

/** «Бублик подсказывает» на главной, телефон. */
export function LeaveTipMobile() {
  const m = useLeaveTip();
  const v = view(m);
  if (!v) return null;
  return (
    <div className="px-4">
      <div className="box-border flex w-full flex-col gap-3 rounded-[22px] border-2 border-ink bg-sky-soft p-[14px]">
        <div className="flex items-center gap-3">
          <img src="/m-home/img.png" alt="" className="size-16 shrink-0 object-contain" />
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-[10px] leading-[normal] font-extrabold tracking-[1.2px] whitespace-nowrap text-primary">
              БУБЛИК ПОДСКАЗЫВАЕТ
            </span>
            <span className="text-sm leading-[19px] font-bold text-foreground">{v.headline}</span>
          </div>
        </div>
        {v.state === "offer" && <Modes m={m} />}
        {v.state === "offer" && <Note m={m} />}
        <Actions m={m} state={v.state} buttonClassName="h-12 min-w-0 flex-1 px-5 text-sm" />
      </div>
    </div>
  );
}
