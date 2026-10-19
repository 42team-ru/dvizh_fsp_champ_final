import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { Icon } from "@/shared/components/ui/icon";
import { Participants } from "@/shared/components/ui/participants";
import { cn } from "cn";

export type EventCover = {
  /** Токен фона, например `bg-orange`. */
  bg?: string;
  /** Фото на всю обложку. */
  photo?: string;
  /** Memphis-узор поверх фона. */
  art?: { src: string; className: string };
};

export type EventCardData = {
  sport: string;
  time: string;
  distance: string;
  title: string;
  place: string;
  people: string[];
  going: number;
  total?: number;
  tone?: "default" | "warning";
  cover: EventCover;
};

export function EventCover({ cover, height }: { cover: EventCover; height: number }) {
  return (
    <>
      <div className={cn("absolute inset-x-0 top-0", cover.bg)} style={{ height }}>
        {cover.photo ? (
          <img src={cover.photo} alt="" className="size-full max-w-none object-cover" />
        ) : null}
        {cover.art ? (
          <img src={cover.art.src} alt="" className={cn("absolute max-w-none", cover.art.className)} />
        ) : null}
      </div>
      <div
        className="absolute inset-x-0 top-0 bg-[linear-gradient(180deg,rgba(22,24,31,0.08)_0%,rgba(22,24,31,0)_30%,rgba(22,24,31,0)_55%,rgba(22,24,31,0.62)_100%)]"
        style={{ height }}
      />
      <div className="absolute inset-x-0 top-0 bg-[rgba(246,244,255,0.1)]" style={{ height }} />
    </>
  );
}

export function EventChips({ sport, time }: { sport: string; time: string }) {
  return (
    <div className="absolute top-[14px] right-[14px] left-[14px] flex justify-between">
      <Badge variant="outline">{sport}</Badge>
      <Badge variant="secondary">
        <Icon name="feed/icon-clock" className="size-[14px]" />
        {time}
      </Badge>
    </div>
  );
}

export function EventDistance({
  top,
  large,
  children,
}: {
  top: number;
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute left-4 flex items-center gap-[6px]" style={{ top }}>
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
 * Карточка события ленты. Размер карточки и высота обложки (`coverHeight`, вместе с нижней
 * обводкой) задаются по Figma. `size="lg"` — крупная: заголовок 26px и отступы 20px.
 */
export function EventCard({
  event,
  coverHeight,
  distanceTop,
  size = "md",
  titleLines = 1,
  className,
}: {
  event: EventCardData;
  coverHeight: number;
  distanceTop: number;
  size?: "md" | "lg";
  titleLines?: 1 | 2;
  className?: string;
}) {
  const large = size === "lg";
  const titleBox = large ? 31 : titleLines === 2 ? 43 : 21.5;
  return (
    <Card className={cn("absolute overflow-hidden p-[2px]", className)}>
      <div
        className="relative w-[calc(100%+4px)] shrink-0 overflow-hidden border-b-2 border-ink"
        style={{ height: coverHeight }}
      >
        <EventCover cover={event.cover} height={coverHeight - 2} />
        <EventChips sport={event.sport} time={event.time} />
        <EventDistance top={distanceTop} large={large}>
          {event.distance}
        </EventDistance>
      </div>
      <div
        className={cn(
          "flex w-[calc(100%+4px)] shrink-0 flex-col gap-3",
          large ? "p-5" : "px-[18px] pt-4 pb-[18px]"
        )}
      >
        <div>
          <div style={{ height: titleBox }}>
            <h3
              className={cn(
                "-mt-px font-display font-bold text-foreground",
                large
                  ? "text-[26px] leading-8 tracking-[-0.5px] whitespace-nowrap"
                  : titleLines === 2
                    ? "w-[226px] text-[18px] leading-[21.5px]"
                    : "text-[18px] leading-[22px] whitespace-nowrap"
              )}
            >
              {event.title}
            </h3>
          </div>
          <p className="mt-[6px] text-sm leading-[19px] font-medium whitespace-nowrap text-muted-foreground">
            {event.place}
          </p>
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
