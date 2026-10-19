import { Button } from "@/shared/components/ui/button";
import { EVENT_LEVEL_LABEL, FORMAT_LABEL, JOIN_MODE_LABEL } from "@/shared/lib/statuses";
import type { FeedExtra } from "@/entity/event/model/use-feed-filters";
import { cn } from "cn";

const GROUPS = [
  { key: "level", title: "Уровень", labels: EVENT_LEVEL_LABEL },
  { key: "joinMode", title: "Запись", labels: JOIN_MODE_LABEL },
  { key: "format", title: "Формат", labels: FORMAT_LABEL },
] as const;

/** Панель кнопки «Ещё»: уровень, режим записи, формат и «Для меня». Повторный клик по значению снимает его. */
export function FeedExtraFilters({ value, onChange, className }: {
  value: FeedExtra;
  onChange(value: FeedExtra): void;
  className?: string;
}) {
  const empty = Object.values(value).every((v) => v === undefined || v === false);
  return (
    <div className={cn("flex flex-wrap items-start gap-x-8 gap-y-4 rounded-[28px] border-2 border-ink bg-card p-5", className)}>
      {GROUPS.map((group) => (
        <fieldset key={group.key} className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-extrabold tracking-[1px] text-muted-foreground uppercase">{group.title}</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(group.labels).map(([code, label]) => {
              const active = value[group.key] === code;
              return (
                <Button key={code} type="button" size="chip" variant={active ? "ink" : "soft"} aria-pressed={active}
                  onClick={() => onChange({ ...value, [group.key]: active ? undefined : code })}>
                  {label}
                </Button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-extrabold tracking-[1px] text-muted-foreground uppercase">Подбор</legend>
        <Button type="button" size="chip" variant={value.forMe ? "ink" : "soft"} aria-pressed={!!value.forMe}
          onClick={() => onChange({ ...value, forMe: value.forMe ? undefined : true })}>
          Для меня
        </Button>
      </fieldset>
      <Button type="button" size="chip" variant="ghost" disabled={empty} className="ml-auto self-end"
        onClick={() => onChange({})}>
        Сбросить
      </Button>
    </div>
  );
}
