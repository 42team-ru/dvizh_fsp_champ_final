import { Link } from "react-router";
import { ActivityMobile } from "./activity-mobile";
import { PendingDialog, PendingRow, viewOf } from "./activity-parts";
import { ACTIVITY_TABS, useActivity, type ActivityModel } from "../model/use-activity";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Disc } from "@/shared/components/ui/disc";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Icon } from "@/shared/components/ui/icon";
import { Progress } from "@/shared/components/ui/progress";
import { cn } from "cn";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";

const XS = "h-9 px-4 text-[13px] leading-[18px]";
const MONTHS = ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЙ", "ИЮН", "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"];
const TICKET_TONES = ["bg-accent", "bg-primary"];

function Img({ src, className }: { src: string; className?: string }) {
  return <img src={`/activity/${src}`} alt="" className={cn("absolute max-w-none", className)} />;
}

/** Кружок «не прочитано»: нажатие помечает уведомление прочитанным. Область нажатия больше самой точки. */
function Dot({ onRead }: { onRead(): void }) {
  return (
    <button type="button" onClick={onRead} aria-label="Пометить прочитанным" title="Пометить прочитанным"
      className="group -m-2 flex size-[26px] shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ink">
      <span className="box-border size-[10px] rounded-[5px] border border-ink bg-accent transition-transform group-hover:scale-150" />
    </button>
  );
}

function IconSquare({ tone, icon }: { tone: string; icon: string }) {
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-ink", tone)}>
      <Icon name={`activity/${icon}`} className="size-5" />
    </span>
  );
}

function FilterBar({ m }: { m: ActivityModel }) {
  return (
    <div className="relative h-[50px] w-[1216px] shrink-0">
      <h1 className="absolute top-0 left-0 w-[303.5px] font-display text-[40px] leading-[50px] font-extrabold tracking-[-1px] whitespace-nowrap text-foreground">
        Активность
      </h1>
      <div className="absolute top-[6px] left-[327.5px] flex gap-2" role="tablist" aria-label="Тип активности">
        {ACTIVITY_TABS.map((t) => {
          const active = m.tab === t.key;
          const unread = m.unreadOf(t.key);
          return (
            <Button key={t.key} role="tab" aria-selected={active} variant={active ? "ink" : "soft"} size="chip"
              className={cn("gap-2", active && "hover:translate-x-0 hover:translate-y-0")} onClick={() => m.setTab(t.key)}>
              {t.label}
              {t.key !== "all" && unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-[10px] bg-accent px-1 text-[11px] leading-[15px] font-extrabold text-white">
                  {unread}
                </span>
              )}
            </Button>
          );
        })}
      </div>
      {m.totalUnread > 0 && (
        <button type="button" onClick={m.markAllRead} title="Отметить всё прочитанным"
          className="absolute top-3 right-0">
          <Badge variant="accent" className="text-[13px] leading-[18px] text-white">{m.totalUnread} новых · прочитать</Badge>
        </button>
      )}
    </div>
  );
}

/** Лента: уведомления выбранного типа по дням; во вкладке «Заявки» — мои заявки в ожидании. */
function Feed({ m }: { m: ActivityModel }) {
  return (
    <Card className="absolute top-0 left-0 h-[626px] w-[701px] overflow-hidden">
      <div className="absolute inset-x-6 top-6 bottom-6 flex flex-col gap-[10px] overflow-y-auto pr-1">
        {m.tab === "requests" ? (
          <>
            <Eyebrow>ЖДУТ РЕШЕНИЯ ОРГАНИЗАТОРА</Eyebrow>
            {m.pendingItems.length === 0 && !m.pending.isPending && (
              <p className="text-[15px] font-medium text-muted-foreground">Заявок в ожидании нет. Записи по заявке появятся здесь, пока организатор их не рассмотрит.</p>
            )}
            {m.pendingItems.map((reg) => <PendingRow key={reg.id} reg={reg} />)}
          </>
        ) : (
          <>
            {m.list.isPending && <p className="text-[15px] font-medium text-muted-foreground">Загружаем…</p>}
            {m.list.isError && <p role="alert" className="text-[15px] font-medium text-destructive">Не удалось загрузить активность.</p>}
            {m.list.isSuccess && m.groups.length === 0 && (
              <p className="text-[15px] font-medium text-muted-foreground">Здесь пока пусто. Ответы в обсуждениях, новые достижения и напоминания о встречах появятся тут.</p>
            )}
            {m.groups.map((group) => (
              <section key={group.label} className="flex flex-col gap-[10px]">
                <Eyebrow className="mt-1">{group.label}</Eyebrow>
                {group.items.map((n) => {
                  const v = viewOf(n);
                  return (
                    <div key={n.id}
                      className={cn("box-border flex min-h-[76px] w-full shrink-0 items-center gap-[14px] rounded-[18px] border-2 border-ink px-[18px] py-3",
                        n.readAt ? "bg-card" : "bg-lime-soft")}>
                      {v.actor
                        ? <Disc initials={(v.actor.firstName?.[0] ?? "") + (v.actor.lastName?.[0] ?? "")} user={v.actor} tone="bg-sky"
                            className="size-11 shrink-0" textClassName="text-sm leading-[19px] tracking-[-0.5px]" />
                        : <IconSquare tone={v.tone} icon={v.icon} />}
                      <div className="min-w-0 flex-1 text-[15px] leading-[22px] font-medium text-foreground line-clamp-2">{v.text}</div>
                      <Button asChild variant={n.type === "ACHIEVEMENT_UNLOCKED" ? "secondary" : "soft"} className={cn(XS, "shrink-0")}>
                        <Link to={v.href} onClick={() => m.markRead(n)}>{v.action}</Link>
                      </Button>
                      {!n.readAt && <Dot onRead={() => m.markRead(n)} />}
                    </div>
                  );
                })}
              </section>
            ))}
            {m.hasMore && <Button variant="soft" className="self-center" onClick={m.showMore}>Показать ещё</Button>}
          </>
        )}
      </div>
    </Card>
  );
}

/** «Ты идёшь»: ближайшие подтверждённые записи как посадочные талоны. */
function Tickets({ m }: { m: ActivityModel }) {
  return (
    <Card className="absolute top-0 left-[721px] h-[315px] w-[495px] overflow-hidden">
      <h2 className="absolute top-6 left-6 font-display text-[22px] leading-[27px] font-bold text-foreground">Ты идёшь</h2>
      <span className="absolute top-8 right-6 text-[13px] leading-[18px] font-bold whitespace-nowrap text-muted-foreground">
        {m.goingTotal} {m.goingTotal % 10 === 1 && m.goingTotal % 100 !== 11 ? "билет" : m.goingTotal % 10 >= 2 && m.goingTotal % 10 <= 4 && (m.goingTotal % 100 < 12 || m.goingTotal % 100 > 14) ? "билета" : "билетов"}
      </span>
      <div className="absolute top-[67px] left-6 flex w-[443px] flex-col gap-3">
        {m.goingItems.length === 0 && (
          <p className="text-sm font-semibold text-muted-foreground">
            Ближайших подтверждённых записей нет. <Link to="/feed" className="underline">Найти встречу</Link>
          </p>
        )}
        {m.goingItems.map((reg, i) => {
          const start = new Date(reg.myNextOccurrence?.startAt ?? reg.event.startAt);
          return (
            <Link key={reg.id} to={`/events/${reg.event.id}`}
              className="relative box-border flex h-[104px] w-[443px] shrink-0 items-stretch overflow-hidden rounded-[18px] border-2 border-ink bg-card">
              <div className={cn("relative w-[88px] shrink-0 border-r-2 border-dashed border-ink text-white", TICKET_TONES[i % TICKET_TONES.length])}>
                <p className="absolute inset-x-0 top-[12px] text-center text-[10px] leading-[14px] font-extrabold tracking-[1.5px]">{MONTHS[start.getMonth()]}</p>
                <p className="absolute inset-x-0 top-[26px] text-center font-display text-[30px] leading-[37px] font-extrabold">{start.getDate()}</p>
                <p className="absolute inset-x-0 top-[68px] text-center text-[13px] leading-[18px] font-bold">
                  {start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-[22px] shrink-0 items-center justify-between bg-primary px-3 text-[9px] font-extrabold whitespace-nowrap">
                  <span className="tracking-[1.5px] text-secondary">ПОСАДОЧНЫЙ ТАЛОН</span>
                  <span className="tracking-[1px] text-white">№ {reg.event.id.slice(0, 4).toUpperCase()}</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4">
                  <p className="line-clamp-2 font-display text-[15px] leading-[19px] font-bold text-foreground">{reg.event.title}</p>
                  <div className="flex items-center gap-1">
                    <Icon name="activity/icon-pin" className="size-[14px] shrink-0" />
                    <span className="truncate text-[13px] leading-[18px] font-medium text-muted-foreground">
                      {reg.event.format === "ONLINE" ? "Онлайн" : reg.event.address}
                    </span>
                  </div>
                </div>
              </div>
              <div className="relative w-[104px] shrink-0 overflow-hidden border-l-2 border-dashed border-ink bg-secondary">
                <img src="/event/qr.svg" alt="" className="absolute top-[8px] left-[26px] size-[52px] rounded-md border-2 border-ink bg-card p-[3px]" />
                <div className="pointer-events-none absolute bottom-[6px] left-[10px] h-[28px] w-[84px] rotate-[7deg] text-primary">
                  <img src="/event/stamp-admitted.svg" alt="" className="absolute inset-0 size-full max-w-none" />
                  <p className="absolute inset-x-0 top-[7px] text-center font-display text-[11px] leading-[14px] font-extrabold">ДОПУЩЕН</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function Goal() {
  return (
    <Card className="absolute top-[335px] left-[721px] h-[291px] w-[186px] justify-between overflow-hidden bg-secondary p-[26px]">
      <Img src="memphis2.svg" className="top-0 left-0 h-[220px] w-[200px]" />
      <Img src="jump.png" className="top-[91px] left-[89px] h-[92px] w-[85px] object-cover" />
      <div className="relative h-[69px] w-[134px]">
        <Eyebrow className="text-foreground">ЦЕЛЬ НЕДЕЛИ</Eyebrow>
        <p className="absolute top-[19px] left-0 font-display font-extrabold whitespace-nowrap text-foreground">
          <span className="text-[44px] leading-[44px]">4</span>
          <span className="text-[20px] leading-[44px]"> / 5</span>
        </p>
      </div>
      <div className="relative h-14 w-[134px]">
        <p className="w-[120.5px] text-[13px] leading-[18px] font-bold text-foreground">ещё одна — и цель закрыта</p>
        <Progress value={80} className="absolute top-11 left-0 h-3" />
      </div>
    </Card>
  );
}

/** «Заявки»: сколько моих заявок ждут решения; «Посмотреть» открывает их список. */
function Requests({ m }: { m: ActivityModel }) {
  const first = m.pendingItems[0];
  return (
    <Card className="absolute top-[335px] left-[927px] h-[291px] w-[289px] justify-between overflow-hidden bg-primary p-[26px]">
      <Img src="memphis3.svg" className="top-0 left-0 h-[220px] w-[300px]" />
      <div className="relative h-24 w-[237px]">
        <Eyebrow className="text-lilac">ЗАЯВКИ</Eyebrow>
        <p className="absolute top-[19px] left-0 font-display text-[44px] leading-[55px] font-extrabold text-white">{m.pendingTotal}</p>
        <p className="absolute top-[77px] left-0 w-[237px] truncate text-sm leading-[19px] font-semibold text-white">
          {first ? `ждёт ответа: «${first.event.title}»` : "нет заявок в ожидании"}
        </p>
      </div>
      <div className="relative">
        <PendingDialog items={m.pendingItems} total={m.pendingTotal} loading={m.pending.isPending}>
          <Button variant="secondary" className="h-10 px-[18px] text-sm leading-[19px]">Посмотреть</Button>
        </PendingDialog>
      </div>
    </Card>
  );
}

export default function ActivityPage() {
  const m = useActivity();
  return (
    <>
    <ActivityMobile m={m} />
    <div className="relative isolate hidden min-h-dvh overflow-clip bg-background lg:block">
      <MemphisBackground seed="activity" />
      <AppHeader current="activity" />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 px-8 pt-8 pb-12">
        <FilterBar m={m} />
        <div className="relative h-[626px] w-[1216px] shrink-0">
          <Feed m={m} />
          <Tickets m={m} />
          <Goal />
          <Requests m={m} />
        </div>
      </main>
    </div>
    </>
  );
}
