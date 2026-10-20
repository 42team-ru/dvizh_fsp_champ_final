import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "cn";
import type { BlogWidgetResponse, EventSummaryResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Disc } from "@/shared/components/ui/disc";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { authorName } from "@/entity/blog/lib/post";
import { profilePath } from "@/entity/user/lib/profile-path";

const DATE_TONES = ["bg-secondary", "bg-sky", "bg-peach"];

function TrainingRow({ event, index }: { event: EventSummaryResponse; index: number }) {
  const start = new Date(event.startAt);
  const dow = start.toLocaleDateString("ru-RU", { weekday: "short" }).replace(".", "").toUpperCase();
  const time = start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const seats = event.capacity ? `${event.participantsCount} из ${event.capacity}` : `${event.participantsCount} идут`;
  return (
    <Link to={`/events/${event.id}`}
      className="box-border flex items-center gap-3 rounded-[14px] border-2 border-ink bg-card p-2.5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ink">
      <span className={cn("flex size-14 shrink-0 flex-col items-center justify-center rounded-[10px] border-2 border-ink", DATE_TONES[index % DATE_TONES.length])}>
        <span className="text-[10px] leading-3 font-extrabold tracking-[0.8px]">{dow}</span>
        <span className="font-display text-xl leading-6 font-bold">{start.getDate()}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold text-foreground">{event.title}</span>
        <span className="block truncate text-xs font-semibold text-muted-foreground">
          {time}{event.address ? ` · ${event.address.split(",").slice(-1)[0].trim()}` : ""} · {seats}
        </span>
      </span>
      <span className="hidden shrink-0 rounded-pill border-2 border-ink bg-primary px-3.5 py-1.5 text-[13px] font-bold text-white sm:inline">
        {event.joinMode === "REQUEST" ? "Подать заявку" : "Записаться"}
      </span>
    </Link>
  );
}

/**
 * Виджет «Наши тренировки» в конце поста: клуб или организатор и до трёх ближайших встреч с переходом к записи.
 * `preview` — в редакторе: подпись «так увидят читатели».
 */
export function BlogTrainings({ widget, preview, className }: { widget: BlogWidgetResponse; preview?: boolean; className?: string }) {
  const org = widget.organization;
  const person = widget.organizer;
  const title = org ? `Встречи: ${org.name}` : person ? `Встречи: ${authorName(person)}` : "Ближайшие встречи";
  const allHref = org ? `/orgs/${org.id}` : person ? profilePath(person) : "/feed";
  return (
    <Card className={cn("gap-4 bg-sky-soft p-5 shadow-hard sm:p-6", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="box-border inline-flex h-[26px] items-center rounded-pill border-[1.5px] border-ink bg-card px-2.5 text-[11px] font-extrabold tracking-[0.6px] uppercase">
          Наши тренировки
        </span>
        {preview && <Eyebrow>так увидят читатели</Eyebrow>}
      </div>
      <div className="flex items-center gap-3">
        <Disc initials={org ? org.name.replace(/[«»"]/g, "").slice(0, 2).toUpperCase() : ""} user={person ?? undefined}
          tone={org ? "bg-accent" : "bg-sky"} className="size-12" textClassName="text-base" />
        <div className="min-w-0">
          <p className="font-display text-lg leading-6 font-bold text-foreground">{title}</p>
          <p className="text-[13px] font-semibold text-muted-foreground">Понравилось? Приходи на следующую — новичкам рады.</p>
        </div>
      </div>
      {widget.events.length ? (
        <div className="flex flex-col gap-2.5">
          {widget.events.map((e, i) => <TrainingRow key={e.id} event={e} index={i} />)}
        </div>
      ) : (
        <p className="rounded-[14px] border-2 border-dashed border-ink/40 bg-card px-4 py-3 text-sm font-semibold text-muted-foreground">
          Ближайших встреч пока нет — загляните позже.
        </p>
      )}
      <Button asChild variant="ink" className="self-start">
        <Link to={allHref}><ArrowRight className="size-4" /> {org ? "Все встречи клуба" : "Все встречи организатора"}</Link>
      </Button>
    </Card>
  );
}
