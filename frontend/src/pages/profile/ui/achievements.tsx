import { useState, type CSSProperties } from "react";
import { Check, Lock } from "lucide-react";
import { toBackendUrl } from "@/shared/api/mutators/authMutator";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { Icon } from "@/shared/components/ui/icon";
import { cn } from "cn";
import { useAchievements, type Achievement } from "../model/use-achievements";

const imageUrl = (url: string) => toBackendUrl(url).toString();

const CARD_FOCUS =
  "cursor-pointer text-left outline-none transition-shadow hover:shadow-[3px_3px_0_var(--ink)] focus-visible:ring-[3px] focus-visible:ring-primary";

const earnedDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }).replace(" г.", "");

/** Картинка достижения в цветной плитке; у неполученного — пунктир и замок. */
function Badge({ a, size }: { a: Achievement; size: "sm" | "lg" | "xl" }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border-2",
        size === "sm" && "size-10 rounded-xl",
        size === "lg" && "size-12 rounded-[14px]",
        size === "xl" && "size-[120px] rounded-[24px] border-[2.5px] sm:size-[168px]",
        a.earned ? cn("border-ink", a.tone) : "border-dashed border-muted-foreground bg-card",
      )}
    >
      <img src={imageUrl(a.imageUrl)} alt="" className={cn("size-full object-cover", !a.earned && "opacity-35 grayscale")} />
      {!a.earned && (
        <span className="absolute right-0 bottom-0 flex size-[18px] items-center justify-center rounded-tl-lg border-t-2 border-l-2 border-dashed border-muted-foreground bg-card">
          <Icon name="profile/icon-lock" className="size-3" />
        </span>
      )}
    </span>
  );
}

function progressPercent(a: Achievement) {
  return Math.round((a.progress / a.goal) * 100);
}

/** Прогресс неполученного: «2 из 3 видов спорта» и полоска. */
function Progress({ a }: { a: Achievement }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="h-[6px] w-full overflow-hidden rounded-pill border border-ink bg-card">
        <span className="block h-full bg-primary" style={{ width: `${progressPercent(a)}%` }} />
      </span>
      <span className="text-[11px] leading-[14px] font-bold text-muted-foreground">
        {a.progress} из {a.goal} {a.unit}
      </span>
    </span>
  );
}

function Count({ earned, total }: { earned: number; total: number }) {
  return (
    <span className="text-[13px] leading-[18px] font-bold whitespace-nowrap text-muted-foreground">
      {earned} из {total}
    </span>
  );
}

function Eyebrow({ children, className }: { children: string; className?: string }) {
  return <span className={cn("text-[10px] leading-[14px] font-extrabold tracking-[1.2px]", className)}>{children}</span>;
}

/** Подсказка внизу диалога: что осталось или кому принадлежит награда. */
function dialogHint(a: Achievement, mine: boolean) {
  if (a.earned) return mine ? "Награда уже на твоём счёте" : "Награда получена";
  return `До цели: ещё ${a.goal - a.progress} ${a.unit}`;
}

/** Диалог достижения: условие, награда, прогресс; на мобильном — шторка снизу. */
function AchievementDialog({ a, mine, onClose }: { a: Achievement | null; mine: boolean; onClose: () => void }) {
  return (
    <Dialog open={a !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92dvh] flex-col gap-[18px] overflow-y-auto rounded-[24px] border-[2.5px] border-ink bg-card p-5 shadow-[8px_8px_0_var(--ink)] max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:w-full max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:shadow-none sm:max-w-[560px] sm:gap-[22px] sm:p-7"
      >
        {a && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Eyebrow className="text-primary">ДОСТИЖЕНИЕ</Eyebrow>
                <DialogTitle className="font-display text-xl leading-[1.25] font-extrabold sm:text-[22px]">{a.title}</DialogTitle>
              </div>
              <DialogClose asChild>
                <button
                  type="button"
                  aria-label="Закрыть"
                  className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-pill border-2 border-ink bg-card outline-none focus-visible:ring-[3px] focus-visible:ring-primary"
                >
                  <span aria-hidden className="text-xl leading-none font-extrabold">✕</span>
                </button>
              </DialogClose>
            </div>
            <DialogDescription className="sr-only">{a.description}. Награда: {a.reward}</DialogDescription>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
              <Badge a={a} size="xl" />
              <div className="flex w-full min-w-0 flex-1 flex-col gap-[14px]">
                <span
                  className={cn(
                    "flex w-fit items-center gap-[6px] rounded-pill border-[1.5px] py-[5px] pr-3 pl-[10px] text-[11px] leading-[14px] font-extrabold",
                    a.earned ? "border-ink bg-lime text-ink" : "border-dashed border-muted-foreground bg-card text-muted-foreground",
                  )}
                >
                  {a.earned ? <Check className="size-[14px]" strokeWidth={3} /> : <Lock className="size-[14px]" strokeWidth={2.2} />}
                  {a.earned ? `ПОЛУЧЕНО · ${earnedDate(a.earnedAt!)}` : "ЕЩЁ НЕ ПОЛУЧЕНО"}
                </span>
                <div className="flex flex-col gap-[6px]">
                  <Eyebrow className="text-muted-foreground">УСЛОВИЕ</Eyebrow>
                  <p className="text-[15px] leading-[20px] font-bold text-foreground">{a.description}</p>
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Eyebrow className="text-muted-foreground">НАГРАДА</Eyebrow>
                  <span className="flex w-fit items-center gap-2 rounded-[14px] border-2 border-ink bg-peach py-2 pr-[14px] pl-[10px] font-display text-base leading-5 font-bold">
                    <Icon name="profile/icon-coin" className="size-6" />
                    {a.reward}
                  </span>
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Eyebrow className="text-muted-foreground">ПРОГРЕСС</Eyebrow>
                  <span
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={a.goal}
                    aria-valuenow={a.progress}
                    className="h-[10px] w-full overflow-hidden rounded-pill border-[1.5px] border-ink bg-card"
                  >
                    <span className="block h-full bg-primary" style={{ width: `${progressPercent(a)}%` }} />
                  </span>
                  <span className="text-[13px] leading-[18px] font-bold text-muted-foreground">
                    {a.progress} из {a.goal} {a.unit}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <p className="text-xs leading-4 font-semibold text-muted-foreground sm:flex-1">{dialogHint(a, mine)}</p>
              <DialogClose asChild>
                <Button className="min-h-11 w-full px-7 sm:w-auto">Понятно</Button>
              </DialogClose>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Колонка достижений справа от паспорта (десктоп). */
export function AchievementsColumn({ className, style }: { className?: string; style?: CSSProperties }) {
  const { query, achievements, earnedCount, total, mine } = useAchievements();
  const [opened, setOpened] = useState<Achievement | null>(null);
  return (
    <section
      aria-label="Достижения"
      style={style}
      className={cn("flex flex-col gap-4 overflow-hidden rounded-[24px] border-2 border-ink bg-card p-5", className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-[22px] leading-[27px] font-extrabold text-foreground">Достижения</h2>
        <Count earned={earnedCount} total={total} />
      </div>
      {query.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">Загружаем…</p>
      ) : query.isError ? (
        <p className="text-sm text-muted-foreground">Не удалось загрузить достижения.</p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto p-1 pr-2 [scrollbar-color:var(--ink)_transparent] [scrollbar-width:thin]">
          {achievements.map((a) => (
            <li key={a.code}>
              <button
                type="button"
                onClick={() => setOpened(a)}
                aria-haspopup="dialog"
                aria-label={`${a.title}: ${a.earned ? "получено" : `${a.progress} из ${a.goal} ${a.unit}`}. Подробнее`}
                className={cn(
                  "flex w-full items-center gap-[10px] rounded-2xl border-2 bg-card p-3",
                  a.earned ? "border-ink" : "border-dashed border-muted-foreground",
                  CARD_FOCUS,
                )}
              >
                <Badge a={a} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={cn("text-[13px] leading-[18px] font-extrabold", a.earned ? "text-foreground" : "text-muted-foreground")}>
                    {a.title}
                  </span>
                  {a.earned ? (
                    <span className="text-[11px] leading-[14px] font-bold text-muted-foreground">{a.description}</span>
                  ) : (
                    <Progress a={a} />
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <AchievementDialog a={opened} mine={mine} onClose={() => setOpened(null)} />
    </section>
  );
}

/** Лента достижений с прокруткой вбок (мобильный). */
export function AchievementsStrip() {
  const { achievements, earnedCount, total, mine } = useAchievements();
  const [opened, setOpened] = useState<Achievement | null>(null);
  return (
    <>
      <div className="flex items-center justify-between px-4 leading-[normal] font-bold whitespace-nowrap">
        <h2 className="font-display text-lg text-foreground">Достижения</h2>
        <Count earned={earnedCount} total={total} />
      </div>
      <ul className="no-scrollbar flex gap-3 overflow-x-auto p-1 px-4">
        {achievements.map((a) => (
          <li key={a.code} className="shrink-0">
            <button
              type="button"
              onClick={() => setOpened(a)}
              aria-haspopup="dialog"
              aria-label={`${a.title}: ${a.earned ? "получено" : `${a.progress} из ${a.goal} ${a.unit}`}. Подробнее`}
              className={cn(
                "box-border flex h-full w-[140px] flex-col items-start gap-[10px] rounded-[20px] border-2 bg-card p-[14px]",
                a.earned ? "border-ink" : "border-dashed border-muted-foreground",
                CARD_FOCUS,
              )}
            >
              <Badge a={a} size="lg" />
              <span className={cn("text-[13px] leading-[17px] font-extrabold", a.earned ? "text-foreground" : "text-muted-foreground")}>
                {a.title}
              </span>
              {a.earned ? (
                <span className="text-[11px] leading-[14px] font-bold text-muted-foreground">{a.description}</span>
              ) : (
                <span className="w-full">
                  <Progress a={a} />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <AchievementDialog a={opened} mine={mine} onClose={() => setOpened(null)} />
    </>
  );
}
