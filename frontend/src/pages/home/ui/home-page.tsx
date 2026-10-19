import { OrganizerHome } from "./organizer-home";
import { AdminHome } from "./admin-home";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { usePetName } from "@/entity/user/model/use-pet-name";
import { Compass } from "lucide-react";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { MyBeaverBadge } from "@/widgets/beaver-pet/ui/my-beaver-badge";
import { DismissButton, useDismissRecommendation } from "@/features/dismiss-recommendation/ui/dismiss-button";
import { Link } from "react-router";
import { HomeMobile } from "./home-mobile";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Icon } from "@/shared/components/ui/icon";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { Participants } from "@/shared/components/ui/participants";
import { Sparkles } from "lucide-react";
import { toCardData } from "@/entity/event/lib/event-format";
import {
  FOR_YOU_FEED_URL,
  formatDistance,
  useRecommendationPreview,
} from "@/entity/event/model/use-recommendation-preview";
import type { RecommendedEventResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { QrCode } from "@/shared/components/ui/qr-code";
import { LeaveTip } from "@/widgets/leave-tip/ui/leave-tip";
import { useUser } from "@/entity/user/model/use-user";
import { calendarUrl, routeUrl, ticketDay, untilStart, useNextTicket } from "@/entity/event/model/use-next-ticket";

/** Обложки карточек подборки, если у события нет своего фото. */
const COVERS = [
  { photo: "/home/box.png" },
  { bg: "bg-orange", art: "/home/memphis3.svg" },
  { bg: "bg-sky", art: "/home/memphis4.svg" },
] as const;


function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`text-[11px] leading-[15px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase ${className ?? ""}`}
    >
      {children}
    </p>
  );
}

function SectionHeading({
  title,
  hint,
  linkLabel,
  to = "/",
}: {
  title: string;
  hint?: string;
  linkLabel: string;
  to?: string;
}) {
  return (
    <div className="flex h-8 items-center justify-between">
      <div className="flex items-start gap-3">
        <h2 className="min-w-[240.5px] font-display text-[26px] leading-8 font-bold tracking-[-0.5px] text-foreground">
          {title}
        </h2>
        {hint ? (
          <span className="mt-[11px] text-sm leading-[19px] font-bold text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
      <Link
        to={to}
        className="flex items-center gap-[6px] text-sm leading-[19px] font-extrabold text-foreground"
      >
        {linkLabel}
        <Icon name="icon-arrow1" className="size-4" />
      </Link>
    </div>
  );
}

/** Герой главной: ближайшая встреча пользователя или приглашение найти/создать свою. */
function Hero() {
  const { user, next, isLoading } = useNextTicket();
  const name = user?.firstName ?? "";
  const e = next?.event;
  const canCreate = user?.systemRole !== "ADMIN";
  const cover = e ? e.coverUrl ?? e.sport.imageUrl : undefined;
  return (
    // Поток вместо абсолютных координат: при крупном шрифте браузера блок растёт, а не обрезает кнопки.
    <section className="relative box-border flex min-h-[330px] items-center justify-between gap-8 overflow-hidden rounded-[28px] border-2 border-ink bg-primary px-[44px] py-[32px]">
      <img src="/home/memphis.svg" alt="" className="absolute top-0 left-0 h-full w-[1216px] max-w-none object-cover object-left-top" />

      <div className="relative w-[700px] min-w-0 shrink">
        <p className="text-[15px] leading-[21px] font-bold text-white opacity-90">
          Привет{name ? `, ${name}` : ""}! {e ? (next.role === "organizer" ? "Ты ведёшь" : "Дальше у тебя") : isLoading || user?.systemRole === "ADMIN" ? "" : "Ближайших встреч пока нет"}
        </p>
        <h1 className="mt-[6px] line-clamp-2 min-h-[109px] font-display text-[52px] leading-[54.5px] font-extrabold tracking-[-1px] text-white">
          {e ? e.title : isLoading ? "…" : user?.systemRole === "ADMIN" ? "Все события платформы" : "Найди компанию для спорта"}
        </h1>
        {e && next && (
          <div className="mt-[26px] flex max-w-[700px] gap-2">
            <Badge variant="outline" className="shrink-0 text-[13px] leading-[18px]">
              <Icon name="icon-clock" className="size-[14px]" />
              {ticketDay(next.startAt)}
            </Badge>
            <Badge variant="outline" className="min-w-0 shrink text-[13px] leading-[18px]">
              <Icon name="icon-pin" className="size-[14px]" />
              <span className="truncate">{e.format === "ONLINE" ? "Онлайн" : e.address ?? "Место уточняется"}</span>
            </Badge>
          </div>
        )}
        <div className="mt-[26px] flex gap-3">
          {e ? (
            <Button asChild variant="secondary" size="lg" rough>
              <Link to={next!.role === "organizer" ? `/my/events/${e.id}/manage` : `/events/${e.id}`}>
                {next!.role === "organizer" ? "Управлять" : "Открыть билет"}
              </Link>
            </Button>
          ) : canCreate && !isLoading ? (
            <Button asChild variant="secondary" size="lg" rough>
              <Link to="/events/new">Создать встречу</Link>
            </Button>
          ) : null}
          <Button asChild variant="clear" size="lg" rough={{ color: "white" }}>
            <Link to="/feed">
              <Icon name="icon-arrow" className="size-[18px]" />
              {e ? "Другие события" : "Смотреть ленту"}
            </Link>
          </Button>
        </div>
      </div>

      {e && next && (
        <Link to={`/events/${e.id}`} aria-label={`Билет: ${e.title}`}
          className="relative box-border h-[244px] w-[356px] shrink-0 overflow-hidden rounded-[22px] border-2 border-ink bg-card p-0 shadow-hard">
          <div className="relative h-[118px] w-[352px] shrink-0 overflow-hidden border-b-2 border-ink">
            <div className="absolute inset-x-0 top-0 h-[116px] bg-orange">
              {cover ? (
                <img src={cover} alt="" className="size-full max-w-none object-cover" />
              ) : (
                <img src="/home/memphis1.svg" alt="" className="absolute top-[-74px] left-0 h-[264px] w-[352px] max-w-none" />
              )}
            </div>
            <div className="absolute inset-x-0 top-0 h-[116px] bg-gradient-to-b from-transparent from-40% to-[rgba(22,24,31,0.55)]" />
            <Badge variant="outline" title={e.sport.name} className="absolute top-3 left-[14px] max-w-[calc(100%-28px)]">
              <span className="truncate">{e.sport.name}</span>
            </Badge>
            <p className="absolute top-[91px] left-4 text-[11px] leading-[15px] font-extrabold tracking-[1.5px] text-white">
              БИЛЕТ № {e.id.slice(0, 4).toUpperCase()}
            </p>
          </div>
          <div className="relative flex h-[122px] w-[352px] shrink-0">
            <div className="flex w-[248px] min-w-0 flex-col justify-between px-4 py-[14px]">
              <div>
                <Eyebrow>КОГДА</Eyebrow>
                <p className="mt-1 truncate font-display text-[17px] leading-[21px] font-bold text-foreground">
                  {ticketDay(next.startAt)}
                </p>
              </div>
              <div className="min-w-0">
                <Eyebrow>{e.locationNote ? "КАК НАЙТИ" : "ДО НАЧАЛА"}</Eyebrow>
                <p className="mt-[2px] truncate text-[14px] leading-[19px] font-bold text-foreground">
                  {e.locationNote ?? untilStart(next.startAt)}
                </p>
              </div>
            </div>
            <div className="absolute top-3 left-[252px] h-[98px] w-[2px] border-l-2 border-dashed border-ink" />
            <span className="absolute top-[-11px] left-[241px] box-border size-[22px] rounded-[11px] border-2 border-ink bg-card" />
            <div className="flex w-[104px] items-center justify-center">
              <QrCode path={`/events/${e.id}`} label="QR-код: страница встречи" className="size-[76px]" />
            </div>
          </div>
        </Link>
      )}
    </section>
  );
}

/** Запасная подсказка Бублика, когда «когда выходить» нечего сказать: календарь и маршрут, без встречи — куда пойти дальше. */
function Tip() {
  const petName = usePetName();
  const { user, next, isLoading } = useNextTicket();
  if (isLoading || user?.systemRole === "ADMIN") return null;
  const e = next?.event;
  const text = e
    ? `${ticketDay(next!.startAt)} — «${e.title}». Добавь в календарь, чтобы не забыть`
    : user?.systemRole === "ORG"
      ? "Опубликуй встречу клуба — она сразу появится в ленте"
      : "Расскажи, чем любишь заниматься, — подберу встречи рядом";
  return (
    <Card className="relative min-h-[104px] flex-row items-center gap-5 bg-mint-soft py-4 pr-[26px] pl-[152px]">
      <MyBeaverBadge className="absolute top-1/2 left-[10px] h-[118px] w-[132px] -translate-y-1/2" />
      <div className="min-w-0 flex-1">
        <Eyebrow>{petName.toUpperCase()} ПОДСКАЗЫВАЕТ</Eyebrow>
        <p className="mt-[6px] truncate font-display text-[18px] leading-[23.5px] font-bold text-foreground">{text}</p>
      </div>
      {e ? (
        <>
          <Button asChild variant="ink" rough>
            <a href={calendarUrl(e.id)} download>
              <Icon name="icon-bell1" className="size-[18px]" />
              В календарь
            </a>
          </Button>
          {e.format === "OFFLINE" && e.address && (
            <Button asChild variant="soft" rough={false}>
              <a href={routeUrl(e.address)} target="_blank" rel="noreferrer">Как добраться</a>
            </Button>
          )}
        </>
      ) : (
        <Button asChild variant="ink" rough>
          <Link to={user?.systemRole === "ORG" ? "/events/new" : "/onboarding"}>
            {user?.systemRole === "ORG" ? "Создать встречу" : "Выбрать интересы"}
          </Link>
        </Button>
      )}
    </Card>
  );
}

/** Карточка рекомендации: та же вёрстка, что в макете, данные — из recommendations_events. */
function EventCard({ item, index, onDismiss }: { item: RecommendedEventResponse; index: number; onDismiss(id: string): void }) {
  const { event } = item;
  const photo = event.coverUrl ?? event.sport.imageUrl;
  const cover = photo ? { photo } : COVERS[index % COVERS.length];
  const card = toCardData(event, { bg: "bg-sky" });
  const where = event.format === "ONLINE" ? "Онлайн" : formatDistance(item.distanceKm) ?? card.distance;
  return (
    <Card className="relative h-[323.5px] overflow-hidden p-0">
      <Link to={`/events/${event.id}`} aria-label={event.title} className="absolute inset-0 z-10" />
      <DismissButton onDismiss={() => onDismiss(event.id)} className="absolute top-3 right-3" />
      <div className="relative h-[180px] w-full shrink-0 overflow-hidden border-b-2 border-ink">
        <div className={`absolute inset-x-0 top-0 h-[178px] ${"bg" in cover ? cover.bg : ""}`}>
          {"photo" in cover ? (
            <img src={cover.photo} alt="" className="size-full max-w-none object-cover" />
          ) : (
            <img
              src={cover.art}
              alt=""
              className="absolute top-[-56.5px] left-0 h-[291px] w-full max-w-none"
            />
          )}
        </div>
        <div className="absolute inset-x-0 top-0 h-[178px] bg-[linear-gradient(180deg,rgba(22,24,31,0.08)_0%,rgba(22,24,31,0)_30%,rgba(22,24,31,0)_55%,rgba(22,24,31,0.62)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[178px] bg-[rgba(246,244,255,0.1)]" />
        <div className="absolute top-[14px] right-[14px] left-[14px] flex justify-between gap-2">
          <Badge variant="outline" title={card.sport} className="min-w-0 shrink"><span className="truncate">{card.sport}</span></Badge>
          <Badge variant="secondary">
            <Icon name="icon-clock" className="size-[14px]" />
            {card.time}
          </Badge>
        </div>
        <div className="absolute top-[147px] right-4 left-4 flex items-center gap-[6px]">
          <Icon name="icon-pin1" className="size-4 shrink-0" />
          <span className="truncate text-[13px] leading-[18px] font-semibold text-white">{where}</span>
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-3 px-[18px] pt-4 pb-[18px]">
        <div className="h-[46.5px]">
          <h3 className="-mt-px truncate font-display text-[18px] leading-[22px] font-bold text-foreground">
            {card.title}
          </h3>
          <p className="mt-[6px] flex items-center gap-1 truncate text-sm leading-[19px] font-semibold text-primary">
            <Sparkles className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{item.reasons[0]?.text ?? card.place}</span>
          </p>
        </div>
        <Participants people={card.people} going={card.going} total={card.total} tone={card.tone} />
      </div>
    </Card>
  );
}

function Recommendations() {
  const petName = usePetName();
  const { items, isPending, isError } = useRecommendationPreview(3);
  const { dismiss } = useDismissRecommendation();
  if (isPending) {
    return <p className="text-lg font-semibold text-muted-foreground">Подбираем встречи…</p>;
  }
  if (isError) {
    return <p role="alert" className="text-lg font-semibold text-destructive">Не удалось загрузить подборку.</p>;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        tone="bg-mint"
        title={`${petName} ещё подбирает встречи`}
        text="Отметь любимые виды спорта в профиле — и здесь появятся встречи для тебя. А пока загляни в ленту."
        action={
          <Button asChild>
            <Link to="/feed">Открыть ленту</Link>
          </Button>
        }
      />
    );
  }
  return (
    <div className="grid grid-cols-3 gap-5">
      {items.map((item, i) => (
        <EventCard key={item.event.id} item={item} index={i} onDismiss={dismiss} />
      ))}
    </div>
  );
}

/** Главная клуба и админа: свой экран, один на телефон и компьютер. */
function RoleHome({ role }: { role: "ORG" | "ADMIN" }) {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-background pb-24 lg:pb-0">
      <div className="hidden lg:block">
        <AppHeader current="home" />
      </div>
      <main className="mx-auto flex w-full max-w-[1280px] flex-col px-4 pt-5 pb-12 lg:px-8 lg:pt-8">
        {role === "ORG" ? <OrganizerHome /> : <AdminHome />}
      </main>
      <div className="lg:hidden">
        <MobileTabBar current="home" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useUser();
  if (user?.systemRole === "ORG" || user?.systemRole === "ADMIN") return <RoleHome role={user.systemRole} />;
  return (
    <>
    <HomeMobile />
    <div className="relative isolate hidden min-h-dvh overflow-hidden bg-background lg:block">
      <MemphisBackground />
      <div className="relative z-10">
      <AppHeader current="home" />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 px-8 pt-8 pb-12">
        <Hero />
        <div className="mt-2">
          <LeaveTip fallback={<Tip />} />
        </div>
        {/* подборка строится только для участников: у клуба и админа она всегда пустая */}
        {user?.systemRole === "USER" && (
          <>
            <SectionHeading title="Подобрали для тебя" hint="по интересам, месту и времени" linkLabel="Все рекомендации"
              to={FOR_YOU_FEED_URL} />
            <Recommendations />
          </>
        )}
      </main>
      </div>
    </div>
    </>
  );
}
