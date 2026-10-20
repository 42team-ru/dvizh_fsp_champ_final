import { MyBeaverBadge, type BeaverPose } from "@/widgets/beaver-pet/ui/my-beaver-badge";
import type { ReactNode } from "react";
import { motion } from "motion/react";
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
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="mx-auto flex w-full max-w-[384px] flex-col items-center gap-[10px] rounded-[20px] border-2 border-ink bg-card p-[22px] text-center sm:max-w-[640px] sm:flex-row sm:gap-6 sm:text-left"
    >
      <motion.div
        initial={{ scale: 0.6, rotate: -8 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ rotate: [0, -4, 4, 0], transition: { duration: 0.5 } }}
        transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.06 }}
        className={cn("relative h-[130px] w-[150px] shrink-0 overflow-hidden rounded-2xl border-2 border-ink", art.tone)}
      >
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-x-2 top-3 bottom-1"
        >
          <MyBeaverBadge pose={art.pose} className="size-full" />
        </motion.div>
        {art.ask && (
          <motion.span
            aria-hidden="true"
            animate={{ rotate: [6, -10, 6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full border-2 border-ink bg-card font-display text-lg leading-none font-extrabold text-primary"
          >
            ?
          </motion.span>
        )}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="flex min-w-0 flex-col items-center gap-[10px] sm:items-start"
      >
        <p className="font-display text-[17px] leading-[22px] font-extrabold text-foreground">{title}</p>
        {text && <p className="text-[13px] leading-[19px] font-medium text-muted-foreground">{text}</p>}
        {children}
      </motion.div>
    </motion.div>
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
