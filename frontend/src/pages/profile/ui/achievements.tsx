import type { CSSProperties } from "react";
import { toBackendUrl } from "@/shared/api/mutators/authMutator";
import { Icon } from "@/shared/components/ui/icon";
import { cn } from "cn";
import { useAchievements, type Achievement } from "../model/use-achievements";

const imageUrl = (url: string) => toBackendUrl(url).toString();

/** Картинка достижения в цветной плитке; у неполученного — пунктир и замок. */
function Badge({ a, size }: { a: Achievement; size: "sm" | "lg" }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border-2",
        size === "sm" ? "size-10 rounded-xl" : "size-12 rounded-[14px]",
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

/** Прогресс неполученного: «2 из 3 видов спорта» и полоска. */
function Progress({ a }: { a: Achievement }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="h-[6px] w-full overflow-hidden rounded-pill border border-ink bg-card">
        <span className="block h-full bg-primary" style={{ width: `${Math.round((a.progress / a.goal) * 100)}%` }} />
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

/** Колонка достижений справа от паспорта (десктоп). */
export function AchievementsColumn({ className, style }: { className?: string; style?: CSSProperties }) {
  const { query, achievements, earnedCount, total } = useAchievements();
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
        <ul className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto pr-2 [scrollbar-color:var(--ink)_transparent] [scrollbar-width:thin]">
          {achievements.map((a) => (
            <li
              key={a.code}
              title={`${a.description} · ${a.reward}`}
              className={cn(
                "flex items-center gap-[10px] rounded-2xl border-2 p-3",
                a.earned ? "border-ink bg-card" : "border-dashed border-muted-foreground bg-card",
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Лента достижений с прокруткой вбок (мобильный). */
export function AchievementsStrip() {
  const { achievements, earnedCount, total } = useAchievements();
  return (
    <>
      <div className="flex items-center justify-between px-4 leading-[normal] font-bold whitespace-nowrap">
        <h2 className="font-display text-lg text-foreground">Достижения</h2>
        <Count earned={earnedCount} total={total} />
      </div>
      <ul className="no-scrollbar flex gap-3 overflow-x-auto px-4">
        {achievements.map((a) => (
          <li
            key={a.code}
            className={cn(
              "box-border flex w-[140px] shrink-0 flex-col gap-[10px] rounded-[20px] border-2 bg-card p-[14px]",
              a.earned ? "border-ink" : "border-dashed border-muted-foreground",
            )}
          >
            <Badge a={a} size="lg" />
            <span className={cn("text-[13px] leading-[17px] font-extrabold", a.earned ? "text-foreground" : "text-muted-foreground")}>
              {a.title}
            </span>
            {a.earned ? (
              <span className="text-[11px] leading-[14px] font-bold text-muted-foreground">{a.description}</span>
            ) : (
              <Progress a={a} />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
