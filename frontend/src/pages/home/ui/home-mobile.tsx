import { DismissButton, useDismissRecommendation } from "@/features/dismiss-recommendation/ui/dismiss-button";
import { Link } from "react-router";
import { BrandPlate } from "@/shared/components/ui/brand-plate";
import { useUser } from "@/entity/user/model/use-user";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Disc } from "@/shared/components/ui/disc";
import { Icon } from "@/shared/components/ui/icon";
import { Progress } from "@/shared/components/ui/progress";
import { cn } from "cn";
import { Sparkles } from "lucide-react";
import { formatWhen } from "@/entity/event/lib/event-format";
import {
  FOR_YOU_FEED_URL,
  formatDistance,
  useRecommendationPreview,
} from "@/entity/event/model/use-recommendation-preview";
import { QrCode } from "@/shared/components/ui/qr-code";
import { LeaveTipMobile } from "@/widgets/leave-tip/ui/leave-tip";
import { nextStartOf, untilLabel, useNextTicket } from "@/entity/event/model/use-next-ticket";
import { useUnreadNotifications } from "@/entity/notification/model/use-unread-notifications";
import type { MyRegistrationResponse } from "@/shared/api/generated/core/appAPI.schemas";

const dir = "m-home";

/** Фоны карточек подборки по кругу. */
const TONES = ["bg-sky", "bg-photo-mint", "bg-photo-lilac"];
const DISC_TONES = ["bg-sky", "bg-mint", "bg-peach"];


const tag = "h-auto border-[1.5px] px-[10px] py-1 text-[10px] leading-[normal] font-extrabold tracking-[1px]";

function SectionHead({ title, link, to = "/feed" }: { title: string; link?: string; to?: string }) {
  return (
    <div className="flex items-center justify-between px-4 leading-[normal] whitespace-nowrap">
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      {link ? (
        <Link to={to} className="text-[13px] font-extrabold text-primary">
          {link}
        </Link>
      ) : null}
    </div>
  );
}

function AppBar() {
  const { user } = useUser();
  const unread = useUnreadNotifications().total;
  return (
    <div className="flex h-16 shrink-0 items-center justify-between px-4">
      <BrandPlate>
        <img src="/icon.svg" alt="" className="size-9 shrink-0" />
        <span className="font-display text-base leading-[normal] font-bold whitespace-nowrap text-foreground">
          Движ
        </span>
      </BrandPlate>
      <div className="flex items-center gap-2">
        <Link
          to="/activity"
          aria-label={unread > 0 ? `Активность: ${unread} непрочитанных` : "Активность"}
          className="relative box-border flex size-11 items-center justify-center rounded-[22px] border-2 border-ink bg-card"
        >
          <Icon name={`${dir}/icon-bell`} className="size-5" />
          {unread > 0 && <span className="absolute top-[6px] left-6 box-border size-3 rounded-[6px] border-[1.5px] border-ink bg-accent" />}
        </Link>
        <Link to="/profile" aria-label="Профиль">
          <Disc
            user={user}
            initials={`${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}` || "?"}
            tone="bg-sky"
            className="size-11"
            textClassName="text-xs leading-[normal]"
          />
        </Link>
      </div>
    </div>
  );
}

/** Ближайшая подтверждённая встреча билетом; без записей — приглашение подобрать встречу. */
function NextTicket({ ticket }: { ticket?: MyRegistrationResponse }) {
  if (!ticket) {
    return (
      <div className="px-4">
        <div className="box-border flex w-full flex-col gap-3 rounded-[26px] border-2 border-ink bg-primary p-5 shadow-[4px_4px_0_var(--ink)]">
          <p className="font-display text-[22px] leading-7 font-extrabold text-white">Найди компанию на неделю</p>
          <p className="text-sm leading-[normal] font-medium text-lilac">Подберём встречи по твоим интересам и району.</p>
          <Button asChild variant="secondary" className="h-12 w-full px-5 shadow-none">
            <Link to={FOR_YOU_FEED_URL}>Подобрать встречу</Link>
          </Button>
        </div>
      </div>
    );
  }
  const e = ticket.event;
  const start = nextStartOf(ticket);
  const place = e.format === "ONLINE" ? "Онлайн" : e.address ?? e.locationNote ?? "Место уточняется";
  return (
    <div className="px-4">
      <div className="box-border w-full overflow-hidden rounded-[26px] border-2 border-ink bg-primary shadow-[4px_4px_0_var(--ink)]">
        <div className="flex flex-col gap-[10px] px-5 pt-5 pb-[14px]">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary" title={e.sport.name} className={cn(tag, "min-w-0 shrink")}>
              <span className="truncate">{e.sport.name.toUpperCase()}</span>
            </Badge>
            <span className="text-[13px] leading-[normal] font-bold whitespace-nowrap text-lilac">
              {untilLabel(start)}
            </span>
          </div>
          <p className="font-display text-[22px] leading-7 font-extrabold text-white">
            {e.title}
          </p>
          <div className="flex min-w-0 items-center gap-[6px]">
            <Icon name={`${dir}/icon-pin`} className="size-4 shrink-0" />
            <span className="truncate text-sm leading-[normal] font-medium text-lilac">
              {place}
            </span>
          </div>
          <Button asChild variant="secondary" className="h-12 w-full px-5 shadow-none">
            <Link to={`/events/${e.id}`}>Открыть билет</Link>
          </Button>
        </div>
        <div className="relative h-[22px] bg-card">
          <img
            src={`/${dir}/dash.svg`}
            alt=""
            className="absolute top-[10px] right-[29px] left-[29px] h-[2px] w-[calc(100%-58px)] max-w-none"
          />
          <span className="absolute top-0 left-[-11px] box-border size-[22px] rounded-[11px] border-2 border-ink bg-background" />
          <span className="absolute top-0 right-[-11px] box-border size-[22px] rounded-[11px] border-2 border-ink bg-background" />
        </div>
        <div className="flex items-center gap-3 bg-card px-5 pt-1 pb-[18px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[10px] leading-[normal] font-extrabold">
            <div className="flex flex-col gap-[2px]">
              <span className="text-[10px] tracking-[1px] text-muted-foreground">КОГДА</span>
              <span className="truncate text-sm text-foreground">{formatWhen(start)}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-[2px]">
              <span className="text-[10px] tracking-[1px] text-muted-foreground">
                {e.format === "ONLINE" ? "ФОРМАТ" : e.locationNote ? "СБОР" : "ГДЕ"}
              </span>
              <span className="truncate text-sm text-foreground">
                {e.format === "ONLINE" ? "Онлайн, ссылка в карточке" : e.locationNote ?? place}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <QrCode path={`/events/${e.id}`} label="QR-код: страница встречи" className="size-[63px]" />
            <span className="text-[10px] leading-[normal] font-extrabold tracking-[1px] whitespace-nowrap text-muted-foreground">
              № {e.id.slice(0, 4).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Карусель «Подобрали для тебя»: первые рекомендации, под названием — главная причина. */
function EventScroller() {
  const { items, isPending, isError } = useRecommendationPreview(5);
  const { dismiss } = useDismissRecommendation();
  if (isPending) return <p className="px-4 text-base font-semibold text-muted-foreground">Подбираем встречи…</p>;
  if (isError) return <p role="alert" className="px-4 text-base font-semibold text-destructive">Не удалось загрузить подборку.</p>;
  if (items.length === 0) {
    return (
      <p className="px-4 text-base font-semibold text-muted-foreground">
        Отметь любимые виды спорта в профиле — и Бублик подберёт встречи.
      </p>
    );
  }
  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
      {items.map((item, index) => {
        const e = item.event;
        const going = e.occurrenceAttendeesCount ?? e.participantsCount;
        const total = e.capacity ?? undefined;
        const dist = e.format === "ONLINE" ? "Онлайн" : formatDistance(item.distanceKm);
        return (
          <Card key={e.id} className="relative w-[290px] shrink-0 overflow-hidden rounded-[22px]">
            <Link to={`/events/${e.id}`} aria-label={e.title} className="absolute inset-0 z-10" />
            <DismissButton onDismiss={() => dismiss(e.id)} className="absolute top-3 right-3" />
            <div className={cn("relative h-[120px] shrink-0 overflow-hidden", TONES[index % TONES.length])}>
              {e.coverUrl ?? e.sport.imageUrl ? (
                <img src={e.coverUrl ?? e.sport.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
              ) : (
                <img
                  src={`/${dir}/photo-decor.svg`}
                  alt=""
                  className="absolute top-0 left-0 h-[120px] w-[290px] max-w-none"
                />
              )}
              <Badge
                variant="outline"
                title={e.sport.name}
                className={cn(tag, "absolute top-3 left-3 max-w-[calc(100%-150px)] border-[1.5px] bg-card")}
              >
                <span className="truncate">{e.sport.name.toUpperCase()}</span>
              </Badge>
              <span className="absolute top-3 right-3 rounded-pill bg-ink px-[10px] py-1 text-[11px] leading-[normal] font-extrabold tracking-[1px] whitespace-nowrap text-secondary">
                {formatWhen(e.startAt)}
              </span>
              {dist && (
                <span className="absolute top-[81px] left-3 box-border flex items-center gap-1 rounded-pill border-[1.5px] border-ink bg-card py-1 pr-[10px] pl-2">
                  <Icon name={`${dir}/icon-pin1`} className="size-[13px]" />
                  <span className="text-xs leading-[normal] font-bold text-foreground">{dist}</span>
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2 p-[14px]">
              <p className="truncate font-display text-[15px] leading-[21px] font-bold text-foreground">
                {e.title}
              </p>
              <p className="flex items-center gap-1 text-[13px] leading-[18px] font-semibold text-primary">
                <Sparkles className="size-[14px] shrink-0" aria-hidden />
                <span className="truncate">{item.reasons[0]?.text ?? e.address ?? ""}</span>
              </p>
              <div className="flex items-center gap-2 whitespace-nowrap">
                {going > 0 && (
                  <span className="flex items-center">
                    {Array.from({ length: Math.min(3, going) }, (_, i) => (
                      <Disc
                        key={i}
                        initials=""
                        tone={DISC_TONES[i]}
                        className={cn("size-7", i < Math.min(3, going) - 1 && "mr-[-8px]")}
                        textClassName="text-xs leading-[normal]"
                      />
                    ))}
                  </span>
                )}
                <span className="text-[13px] leading-[normal] font-bold text-foreground">
                  {total ? `Идут ${going} из ${total}` : going > 0 ? `Идут ${going}` : "Будь первым"}
                </span>
                {total && (
                  <span className="ml-auto text-xs leading-[normal] font-extrabold text-muted-foreground">
                    осталось {Math.max(0, total - going)}
                  </span>
                )}
              </div>
              {total && <Progress value={(going / total) * 100} className="bg-card" />}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function HomeMobile() {
  const { user } = useUser();
  const { ticket, isPending } = useNextTicket();
  return (
    <div className="relative isolate flex min-h-dvh flex-col gap-4 overflow-hidden bg-background pb-[110px] lg:hidden">
      <MemphisBackground variant="mobile" />
      <AppBar />
      <div className="flex flex-col gap-[2px] px-4 pt-1 leading-[normal] whitespace-nowrap">
        <h1 className="font-display text-[26px] font-extrabold text-foreground">Привет{user?.firstName ? `, ${user.firstName}` : ""}!</h1>
        {!isPending && <p className="text-[15px] font-medium text-muted-foreground">{ticket ? "Дальше у тебя" : "Ближайших встреч пока нет"}</p>}
      </div>
      {!isPending && <NextTicket ticket={ticket} />}
      <LeaveTipMobile />
      <SectionHead title="Подобрали для тебя" link="Все" to={FOR_YOU_FEED_URL} />
      <EventScroller />
      <MobileTabBar current="home" />
    </div>
  );
}
