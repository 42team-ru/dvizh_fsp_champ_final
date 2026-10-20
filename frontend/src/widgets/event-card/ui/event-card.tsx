import type { EventParticipantResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { Icon } from "@/shared/components/ui/icon";
import { Participants } from "@/widgets/event-card/ui/card-participants";
import { cn } from "cn";
import { Link } from "react-router";
import { Sparkles } from "lucide-react";

export type EventCover = {
  /** Токен фона, например `bg-orange`. */
  bg?: string;
  /** Фото на всю обложку. */
  photo?: string;
  /** Как сдвигать фото при обрезке (CSS object-position); по умолчанию центр. */
  position?: string;
  /** Memphis-узор поверх фона. */
  art?: { src: string; className: string };
};

export type EventCardData = {
  sport: string;
  time: string;
  distance: string;
  title: string;
  place: string;
  people: EventParticipantResponse[];
  going: number;
  total?: number;
  tone?: "default" | "warning";
  cover: EventCover;
};

/** Обложка заполняет родителя: размер задаёт контейнер (`relative`). */
export function EventCover({ cover }: { cover: EventCover }) {
  return (
    <>
      <div className={cn("absolute inset-0", cover.bg)}>
        {cover.photo ? (
          <img src={cover.photo} alt="" style={{ objectPosition: cover.position }}
            className="size-full max-w-none object-cover transition-transform duration-500 group-hover/card:scale-105" />
        ) : null}
        {cover.art ? (
          <img src={cover.art.src} alt="" className={cn("absolute max-w-none", cover.art.className)} />
        ) : null}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,24,31,0.08)_0%,rgba(22,24,31,0)_30%,rgba(22,24,31,0)_55%,rgba(22,24,31,0.62)_100%)]" />
      <div className="absolute inset-0 bg-[rgba(246,244,255,0.1)]" />
    </>
  );
}

export function EventChips({ sport, time }: { sport: string; time: string }) {
  return (
    <div className="absolute top-[14px] right-[14px] left-[14px] flex justify-between gap-2">
      {/* Длинный вид спорта сжимается с многоточием, время всегда целиком. */}
      <Badge variant="outline" title={sport} className="min-w-0 shrink"><span className="truncate">{sport}</span></Badge>
      <Badge variant="secondary">
        <Icon name="feed/icon-clock" className="size-[14px]" />
        {time}
      </Badge>
    </div>
  );
}

export function EventDistance({
  large,
  children,
}: {
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute bottom-[15px] left-4 flex items-center gap-[6px]">
      <Icon name="feed/icon-pin" className="size-4" />
      <span
        className={cn(
          "font-semibold whitespace-nowrap text-white",
          large ? "text-[15px] leading-[21px]" : "text-[13px] leading-[18px]"
        )}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * Карточка события ленты. Ширину задаёт сетка, обложка горизонтальная (`aspect-[16/10]`) и
 * растягивается, если карточку тянет ряд. `coverClassName` меняет пропорции обложки.
 * `size="lg"` — крупная: заголовок 26px и отступы 20px.
 */
export function EventCard({
  event,
  coverClassName,
  size = "md",
  titleLines = 1,
  className,
  href,
  action,
  highlight,
}: {
  event: EventCardData;
  coverClassName?: string;
  size?: "md" | "lg";
  titleLines?: 1 | 2;
  className?: string;
  /** Ссылка на карточку мероприятия: вся карточка кликабельна. */
  href?: string;
  /** Действие в правом верхнем углу поверх ссылки (например, «Не интересно» в подборке). */
  action?: React.ReactNode;
  /** Строка под названием — причина лучшей рекомендации: фиолетовым и со звёздочками. */
  highlight?: boolean;
}) {
  const large = size === "lg";
  const titleBox = large ? 31 : titleLines === 2 ? 43 : 21.5;
  return (
    <Card interactive={!!href} className={cn("group/card relative overflow-hidden p-0", className)}>
      {href && <Link to={href} aria-label={event.title} className="absolute inset-0 z-10" />}
      {action && <div className="absolute top-3 right-3 z-20">{action}</div>}
      <div
        className={cn(
          "relative aspect-[16/10] w-full grow overflow-hidden border-b-2 border-ink",
          coverClassName
        )}
      >
        <EventCover cover={event.cover} />
        <EventChips sport={event.sport} time={event.time} />
        <EventDistance large={large}>
          {event.distance}
        </EventDistance>
      </div>
      <div
        className={cn(
          "flex w-full shrink-0 flex-col gap-3",
          large ? "p-5" : "px-[18px] pt-4 pb-[18px]"
        )}
      >
        <div>
          <div style={{ height: titleBox }}>
            <h3
              className={cn(
                "-mt-px font-display font-bold text-foreground",
                large
                  ? "truncate text-[26px] leading-8 tracking-[-0.5px]"
                  : titleLines === 2
                    ? "line-clamp-2 text-[18px] leading-[21.5px]"
                    : "truncate text-[18px] leading-[22px]"
              )}
            >
              {event.title}
            </h3>
          </div>
          {highlight ? (
            <p className="mt-[6px] flex items-center gap-1 text-sm leading-[19px] font-semibold text-primary">
              <Sparkles className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{event.place}</span>
            </p>
          ) : (
            <p className="mt-[6px] truncate text-sm leading-[19px] font-medium text-muted-foreground">
              {event.place}
            </p>
          )}
        </div>
        <Participants
          people={event.people}
          going={event.going}
          total={event.total}
          tone={event.tone}
        />
      </div>
    </Card>
  );
}
