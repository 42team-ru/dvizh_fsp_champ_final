import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Check, MapPin, Sparkles } from "lucide-react";
import type { RecommendedEventResponse, RecommendedOrganizationResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { useRecommendationsOrganizations } from "@/shared/api/generated/core/recommendations/recommendations";
import { useRecommendationPreview, formatDistance } from "@/entity/event/model/use-recommendation-preview";
import { formatWhen } from "@/entity/event/lib/event-format";
import { coverOf } from "@/entity/event/lib/cover";
import { DismissButton, useDismissRecommendation } from "@/features/dismiss-recommendation/ui/dismiss-button";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { BeaverPet } from "@/widgets/beaver-pet/ui/beaver-pet";
import type { BeaverActivity, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";
import { Compass } from "lucide-react";
import { cn } from "cn";
import type { Pet, Prefs, SportRow } from "./onboarding-steps";

const DAY_SHORT: Record<string, string> = {
  MONDAY: "Пн", TUESDAY: "Вт", WEDNESDAY: "Ср", THURSDAY: "Чт", FRIDAY: "Пт", SATURDAY: "Сб", SUNDAY: "Вс",
};
const DAYTIME: Record<string, string> = { MORNING: "утро", DAY: "день", EVENING: "вечер" };
const COVER_TONES = ["bg-sky", "bg-mint", "bg-peach", "bg-sun"];
const CHIP_TONES = ["bg-sky-soft", "bg-lime-soft", "bg-peach-soft"];

/** Шаг 6: итог настроек и первая подборка встреч и клубов. */
export function StepDone({ name, sports, prefs, pet }: { name: string; sports: SportRow[]; prefs: Prefs; pet: Pet }) {
  const summary = [
    sports.length ? sports.slice(0, 4).map((s) => s.name).join(" · ") : null,
    prefs.days.length ? `${prefs.days.map((d) => DAY_SHORT[d]).join(", ")} · ${DAYTIME[prefs.daytime]}` : null,
    prefs.home ? `${prefs.radiusKm} км от дома` : null,
    pet.name.trim() || null,
  ].filter((s): s is string => !!s);

  return (
    <div className="flex flex-col gap-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="relative flex items-center gap-6 overflow-hidden rounded-[28px] border-2 border-ink bg-primary px-8 py-6 text-white"
      >
        <svg aria-hidden viewBox="0 0 1152 160" className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="none">
          <path d="M520 20 l12 -10 l12 10 l12 -10 l12 10 l12 -10 l12 10 l12 -10 l12 10" fill="none" stroke="var(--lime)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="774" cy="30" r="11" fill="none" stroke="white" strokeWidth="3" />
        </svg>
        <div className="relative flex min-w-0 flex-1 flex-col gap-4">
          <h1 className="font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.5px] lg:text-[40px]">
            Готово{name ? `, ${name}` : ""}! Вот что тебе подойдёт
          </h1>
          <div className="flex flex-wrap gap-2">
            {summary.map((s, i) => (
              <motion.span key={s} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.07, type: "spring", stiffness: 400, damping: 18 }}
                className={cn("inline-flex items-center gap-1 rounded-pill border-2 border-ink px-3 py-1 text-xs font-extrabold text-foreground",
                  i === 0 ? "bg-secondary" : "bg-card")}>
                <Check className="size-3.5" strokeWidth={3} />{s}
              </motion.span>
            ))}
          </div>
        </div>
        <div className="relative hidden shrink-0 items-center gap-2 md:flex">
          <p className="rounded-[16px] border-2 border-ink bg-card px-4 py-3 text-sm font-bold text-foreground shadow-[4px_4px_0_var(--lime)]">
            Я уже присмотрел<br />встречи!
          </p>
          <BeaverPet mood="happy" outfit={pet.outfit as BeaverOutfit} activity={pet.activity as BeaverActivity}
            className="w-[120px] [&_.beaver-speech]:hidden" />
        </div>
      </motion.section>

      <Events />
      <Clubs />
    </div>
  );
}

function Events() {
  const { items, isPending, isError } = useRecommendationPreview(4);
  const { dismiss } = useDismissRecommendation();
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold">Вам подойдёт</h2>
        <span className="text-xs font-semibold text-muted-foreground">лучшие сверху · причины — от подборки</span>
      </div>
      {isPending ? (
        <p role="status" className="text-base font-semibold text-muted-foreground">Подбираем встречи…</p>
      ) : isError ? (
        <p role="alert" className="text-base font-semibold text-destructive">Не удалось загрузить подборку.</p>
      ) : items.length === 0 ? (
        <EmptyState icon={Compass} tone="bg-mint" title="Пока ничего не нашлось"
          text="Рядом нет встреч по твоим видам. Загляни в ленту — там все встречи города." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item, i) => <RecCard key={item.event.id} item={item} index={i} onDismiss={dismiss} />)}
        </div>
      )}
    </section>
  );
}

function RecCard({ item, index, onDismiss }: { item: RecommendedEventResponse; index: number; onDismiss(id: string): void }) {
  const { event } = item;
  const photo = coverOf(event);
  const where = event.format === "ONLINE" ? "Онлайн" : formatDistance(item.distanceKm);
  const meta = [formatWhen(event.startAt), event.capacity ? `${event.participantsCount} из ${event.capacity}` : "без лимита",
    event.joinMode === "REQUEST" ? "по заявке" : null].filter(Boolean).join(" · ");
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, rotate: -0.4 }}
      transition={{ delay: 0.1 + index * 0.08, type: "spring", stiffness: 260, damping: 22 }}
      className={cn("relative flex flex-col overflow-hidden rounded-[22px] border-2 bg-card",
        item.discovery ? "border-dashed border-primary" : "border-ink")}
    >
      <Link to={`/events/${event.id}`} aria-label={event.title} className="absolute inset-0 z-10" />
      <div className={cn("relative h-[92px] shrink-0 border-b-2 border-ink", COVER_TONES[index % COVER_TONES.length])}>
        {photo.src && <img src={photo.src} alt="" style={{ objectPosition: photo.position }} className="absolute inset-y-0 right-0 h-full w-1/2 object-cover" />}
        <span className="absolute top-3 left-3 rounded-pill border-[1.5px] border-ink bg-card px-2.5 py-0.5 text-[11px] font-extrabold">{event.sport.name}</span>
        {item.discovery ? (
          <span className="absolute bottom-2.5 left-3 inline-flex items-center gap-1 rounded-pill bg-ink px-2.5 py-0.5 text-[10px] font-extrabold text-secondary">
            <Sparkles className="size-3" />ПОПРОБУЙТЕ НОВОЕ
          </span>
        ) : where ? (
          <span className="absolute bottom-2.5 left-3 inline-flex items-center gap-1 rounded-pill border-[1.5px] border-ink bg-secondary px-2.5 py-0.5 text-[11px] font-extrabold">
            <MapPin className="size-3" />{where}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base leading-5 font-extrabold">{event.title}</h3>
        <p className="text-xs font-semibold text-muted-foreground">{meta}</p>
        <div className="flex flex-wrap gap-1">
          {item.reasons.slice(0, 3).map((r, i) => (
            <span key={r.code} className={cn("inline-flex items-center gap-1 rounded-pill border-[1.5px] border-ink px-2 py-0.5 text-[11px] font-bold", CHIP_TONES[i % CHIP_TONES.length])}>
              <Check className="size-3" />{r.text}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between pt-1">
          <Button asChild size="sm" className="relative z-20"><Link to={`/events/${event.id}`}>Записаться</Link></Button>
          <DismissButton onDismiss={() => onDismiss(event.id)} className="relative z-20" />
        </div>
      </div>
    </motion.article>
  );
}

function Clubs() {
  const query = useRecommendationsOrganizations({ limit: 2 });
  const clubs: RecommendedOrganizationResponse[] = query.data?.status === 200 ? query.data.data : [];
  if (clubs.length === 0) return null;
  return (
    <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
      <h2 className="shrink-0 font-display text-2xl font-extrabold">Клубы для вас</h2>
      <div className="grid grid-cols-1 flex-1 gap-3 sm:grid-cols-2">
        {clubs.map((c, i) => (
          <motion.div key={c.organization.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }} whileHover={{ y: -2 }}>
            <Link to={`/orgs/${c.organization.id}`}
              className="flex items-center gap-3 rounded-[18px] border-2 border-ink bg-card p-3 hover:bg-muted">
              {c.logoUrl ? (
                <img src={c.logoUrl} alt="" className="size-11 shrink-0 rounded-[12px] border-2 border-ink object-cover" />
              ) : (
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[12px] border-2 border-ink font-display text-lg font-extrabold",
                  i % 2 ? "bg-peach" : "bg-secondary")}>
                  {c.organization.name.replace(/[«»"]/g, "").charAt(0)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-extrabold">{c.organization.name}</span>
                <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  {c.upcomingEvents} встреч впереди
                  {c.reasons.slice(0, 2).map((r) => (
                    <span key={r.code} className="rounded-pill border border-ink bg-sky-soft px-1.5 text-[10px] font-bold text-foreground">{r.text}</span>
                  ))}
                </span>
              </span>
              <ArrowRight className="size-5 shrink-0" />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
