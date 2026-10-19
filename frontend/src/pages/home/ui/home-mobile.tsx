import { MyBeaverBadge } from "@/widgets/beaver-pet/ui/my-beaver-badge";
import { DismissButton, useDismissRecommendation } from "@/features/dismiss-recommendation/ui/dismiss-button";
import { Link } from "react-router";
import { BrandPlate } from "@/shared/components/ui/brand-plate";
import { useUser } from "@/entity/user/model/use-user";
import { useNavAccess } from "@/entity/user/model/use-nav-access";
import { AccountMenu } from "@/features/auth/sign-out/ui/account-menu";
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
import { calendarUrl, routeUrl, ticketDay, untilStart, useNextTicket } from "@/entity/event/model/use-next-ticket";

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
  const nav = useNavAccess();
  return (
    <div className="flex h-16 shrink-0 items-center justify-between px-4">
      <BrandPlate>
        <img src="/icon.svg" alt="" className="size-9 shrink-0" />
        <span className="font-display text-base leading-[normal] font-bold whitespace-nowrap text-foreground">
          Движ
        </span>
      </BrandPlate>
      <div className="flex items-center gap-2">
        {nav.showActivity && (
          <Link
            to="/activity"
            aria-label="Активность"
            className="relative box-border flex size-11 items-center justify-center rounded-[22px] border-2 border-ink bg-card"
          >
            <Icon name={`${dir}/icon-bell`} className="size-5" />
            {nav.unread > 0 && <span className="absolute top-[6px] left-6 box-border size-3 rounded-[6px] border-[1.5px] border-ink bg-accent" />}
          </Link>
        )}
        {nav.showProfile ? (
          <Link to="/profile" aria-label="Профиль">
            <Disc
              user={user}
              initials={`${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "?"}
              tone="bg-sky"
              className="size-11"
              textClassName="text-xs leading-[normal]"
            />
          </Link>
        ) : (
          <AccountMenu />
        )}
      </div>
    </div>
  );
}

/** Ближайшая встреча; без неё — приглашение в ленту или создать свою. */
function NextTicket() {
  const { user, next, isLoading } = useNextTicket();
  const e = next?.event;
  if (isLoading) return null;
  if (!e || !next) {
    return (
      <div className="px-4">
        <div className="box-border flex flex-col gap-3 rounded-[26px] border-2 border-ink bg-primary p-5 shadow-[4px_4px_0_var(--ink)]">
          <p className="font-display text-[22px] leading-7 font-extrabold text-white">Найди компанию для спорта</p>
          <p className="text-sm font-medium text-lilac">
            {user?.systemRole === "ADMIN" ? "Все события платформы — в ленте." : "Запишись на встречу — здесь появится твой билет."}
          </p>
          <Button asChild variant="secondary" className="h-12 w-full px-5 shadow-none">
            <Link to="/feed">Смотреть ленту</Link>
          </Button>
          {user?.systemRole !== "ADMIN" && (
            <Button asChild variant="soft" rough={false} className="h-12 w-full px-5">
              <Link to="/events/new">Создать встречу</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }
  const organizer = next.role === "organizer";
  return (
    <div className="px-4">
      <div className="box-border w-full overflow-hidden rounded-[26px] border-2 border-ink bg-primary shadow-[4px_4px_0_var(--ink)]">
        <div className="flex flex-col gap-[10px] px-5 pt-5 pb-[14px]">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className={tag}>
              {e.sport.name.toUpperCase()}
            </Badge>
            <span className="text-[13px] leading-[normal] font-bold whitespace-nowrap text-lilac">
              {untilStart(next.startAt)}
            </span>
          </div>
          <p className="line-clamp-2 font-display text-[22px] leading-7 font-extrabold text-white">{e.title}</p>
          <div className="flex min-w-0 items-center gap-[6px]">
            <Icon name={`${dir}/icon-pin`} className="size-4 shrink-0" />
            <span className="truncate text-sm leading-[normal] font-medium text-lilac">
              {e.format === "ONLINE" ? "Онлайн" : e.address ?? "Место уточняется"}
            </span>
          </div>
          <Button asChild variant="secondary" className="h-12 w-full px-5 shadow-none">
            <Link to={organizer ? `/my/events/${e.id}/manage` : `/events/${e.id}`}>
              {organizer ? "Управлять" : "Открыть билет"}
            </Link>
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
          <div className="flex min-w-0 flex-1 flex-col gap-[10px] leading-[normal] font-extrabold whitespace-nowrap">
            <div className="flex flex-col gap-[2px]">
              <span className="text-[10px] tracking-[1px] text-muted-foreground">КОГДА</span>
              <span className="text-sm text-foreground">{ticketDay(next.startAt)}</span>
            </div>
            {e.locationNote && (
              <div className="flex min-w-0 flex-col gap-[2px]">
                <span className="text-[10px] tracking-[1px] text-muted-foreground">КАК НАЙТИ</span>
                <span className="truncate text-sm text-foreground">{e.locationNote}</span>
              </div>
            )}
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

/** Подсказка по ближайшей встрече: календарь и маршрут — настоящие ссылки. */
function Tip() {
  const { user, next, isLoading } = useNextTicket();
  const e = next?.event;
  if (isLoading || !e || user?.systemRole === "ADMIN") return null;
  return (
    <div className="px-4">
      <div className="box-border flex w-full flex-col gap-3 rounded-[22px] border-2 border-ink bg-sky-soft p-[14px]">
        <div className="flex items-center gap-3">
          <MyBeaverBadge className="size-16 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-[10px] leading-[normal] font-extrabold tracking-[1.2px] whitespace-nowrap text-primary">
              БУБЛИК ПОДСКАЗЫВАЕТ
            </span>
            <span className="text-sm leading-[19px] font-bold text-foreground">
              Добавь встречу в календарь, чтобы не забыть
            </span>
          </div>
        </div>
        <div className="flex gap-[10px]">
          <Button asChild className="h-12 min-w-0 flex-1 px-5 text-sm">
            <a href={calendarUrl(e.id)} download>В календарь</a>
          </Button>
          {e.format === "OFFLINE" && e.address && (
            <Button asChild variant="soft" rough={false} className="h-12 min-w-0 flex-1 px-5 text-sm">
              <a href={routeUrl(e.address)} target="_blank" rel="noreferrer">Маршрут</a>
            </Button>
          )}
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
                className={cn(tag, "absolute top-3 left-3 border-[1.5px] bg-card")}
              >
                {e.sport.name.toUpperCase()}
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
  const { user, next } = useNextTicket();
  return (
    <div className="relative isolate flex min-h-dvh flex-col gap-4 overflow-hidden bg-background pb-[110px] lg:hidden">
      <MemphisBackground variant="mobile" />
      <AppBar />
      <div className="flex flex-col gap-[2px] px-4 pt-1 leading-[normal]">
        <h1 className="font-display text-[26px] font-extrabold text-foreground">Привет{user?.firstName ? `, ${user.firstName}` : ""}!</h1>
        {next && (
          <p className="text-[15px] font-medium text-muted-foreground">
            {next.role === "organizer" ? "Ты ведёшь" : "Дальше у тебя"}
          </p>
        )}
      </div>
      <NextTicket />
      <Tip />
      {user?.systemRole === "USER" && (
        <>
          <SectionHead title="Подобрали для тебя" link="Все" to={FOR_YOU_FEED_URL} />
          <EventScroller />
        </>
      )}
      <MobileTabBar current="home" />
    </div>
  );
}
