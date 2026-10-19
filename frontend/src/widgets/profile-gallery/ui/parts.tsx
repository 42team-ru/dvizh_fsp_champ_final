import { MyBeaverBadge, type BeaverPose } from "@/widgets/beaver-pet/ui/my-beaver-badge";
import type { ReactNode } from "react";
import type { SportResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { cn } from "cn";
import { IMG, sportTone } from "../lib/gallery";

export function SportPill({ sport, className }: { sport: SportResponse; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border-[1.5px] border-ink px-[10px] py-[3px] text-[11px] font-extrabold whitespace-nowrap text-foreground",
        sportTone(sport.id),
        className,
      )}
    >
      {sport.name}
    </span>
  );
}

/** Мелкий заголовок поля: «ПОДПИСЬ», «1 · С КАКОГО ЗАНЯТИЯ». */
export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase">
      {children}
    </label>
  );
}

/** Круглая кнопка-иконка: закрыть, листать, назад. */
export function RoundButton({
  icon,
  label,
  onClick,
  className,
  iconClassName = "size-4",
}: {
  icon: string;
  label: string;
  onClick(): void;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-card transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <img src={`${IMG}/${icon}.svg`} alt="" className={iconClassName} />
    </button>
  );
}

type EmptyKind = "mine" | "nothing" | "later";
/** Бобр смотрящего в своём наряде: задумался над пустой галереей, машет «загляни позже» и т.п. */
const EMPTY_ART: Record<EmptyKind, { pose: BeaverPose; tone: string; ask?: boolean }> = {
  mine: { pose: "think", tone: "bg-sky", ask: true },
  nothing: { pose: "cheer", tone: "bg-peach" },
  later: { pose: "hello", tone: "bg-lime-soft" },
};

/** Пустое состояние с бобром: заголовок, пояснение и действие. */
export function EmptyState({
  kind,
  title,
  text,
  children,
}: {
  kind: EmptyKind;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  const art = EMPTY_ART[kind];
  return (
    <div className="mx-auto flex w-full max-w-[384px] flex-col items-center gap-[10px] rounded-[20px] border-2 border-ink bg-card p-[22px] text-center">
      <div className={cn("relative h-[130px] w-[150px] overflow-hidden rounded-2xl border-2 border-ink", art.tone)}>
        <MyBeaverBadge pose={art.pose} className="absolute inset-x-2 top-3 bottom-1" />
        {art.ask && (
          <span aria-hidden="true" className="absolute top-2 right-2 flex size-8 rotate-6 items-center justify-center rounded-full border-2 border-ink bg-card font-display text-lg leading-none font-extrabold text-primary">
            ?
          </span>
        )}
      </div>
      <p className="font-display text-[17px] leading-[22px] font-extrabold text-foreground">{title}</p>
      {text && <p className="text-[13px] leading-[19px] font-medium text-muted-foreground">{text}</p>}
      {children}
    </div>
  );
}

/** Счётчик символов в углу поля: «13 / 300». */
export function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className={cn("text-[11px] font-bold", value > max ? "text-destructive" : "text-muted-foreground")}>
      {value} / {max}
    </span>
  );
}
