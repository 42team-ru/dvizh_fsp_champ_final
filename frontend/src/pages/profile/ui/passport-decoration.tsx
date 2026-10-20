import { cn } from "cn";
import { mrzLines } from "./passport-utils";

/** Общие детали бумажного паспорта для разворота и мобильной карточки. */
export function PassportPageHeader({
  title,
  page,
  className,
}: {
  title: string;
  page: number;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative flex items-center justify-between gap-3 bg-ink px-4 py-3 text-lime",
        className,
      )}
    >
      <h2 className="text-xs font-extrabold tracking-[1.5px]">{title}</h2>
      <span className="shrink-0 text-[11px] font-bold tracking-wider text-primary-foreground/80">
        стр. {page}
      </span>
    </header>
  );
}

export function PassportHologram() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -right-3 -bottom-2 size-10 rounded-full border border-primary/30 bg-[conic-gradient(var(--sky),var(--lime),var(--lilac),var(--mint),var(--sky))] opacity-80"
    />
  );
}

export function PassportMrz({
  user,
  className,
}: {
  user?: Parameters<typeof mrzLines>[0] | null;
  className?: string;
}) {
  if (!user) return null;
  return (
    <div
      aria-label="Машиночитаемая зона паспорта"
      className={cn(
        "relative overflow-hidden border-t border-primary/15 pt-2 font-mono text-[15px] leading-[1.5] whitespace-nowrap tracking-[1px] text-muted-foreground",
        className,
      )}
    >
      {mrzLines(user).map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  );
}
