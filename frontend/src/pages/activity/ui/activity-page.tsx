import { NotificationSettingsButton } from "@/features/notification-settings/ui/notification-settings-dialog";
import { Link } from "react-router";
import { ActivityMobile } from "./activity-mobile";
import { PendingRow, PlansDialog, PlansSwitch, TicketRow, viewOf } from "./activity-parts";
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
        <NotificationSettingsButton className="h-[38px] min-h-0 px-4" />
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

/** Лента: уведомления выбранного типа по дням. */
function Feed({ m }: { m: ActivityModel }) {
  return (
    <Card className="absolute top-0 left-0 h-[626px] w-[701px] overflow-hidden">
      <div className="absolute inset-x-6 top-6 bottom-6 flex flex-col gap-[10px] overflow-y-auto pr-1">
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
      </div>
    </Card>
  );
}

/** «Ты идёшь» / «Заявки»: две ближайшие записи выбранной вкладки; «Все» открывает полный список. */
function Plans({ m }: { m: ActivityModel }) {
  const totals = { going: m.goingTotal, requests: m.pendingTotal };
  return (
    <Card className="absolute top-0 left-[721px] h-[315px] w-[495px] overflow-hidden">
      <div className="absolute inset-x-6 top-6 flex items-center justify-between gap-2">
        <PlansSwitch tab={m.plansTab} totals={totals} onChange={m.setPlansTab} />
        <PlansDialog initialTab={m.plansTab} totals={totals}>
          <Button variant="secondary" className={XS}>Все</Button>
        </PlansDialog>
      </div>
      <div className="absolute top-[78px] left-6 flex w-[443px] flex-col gap-3">
        {m.plansTab === "going" ? (
          <>
            {m.goingItems.length === 0 && !m.going.isPending && (
              <p className="text-sm font-semibold text-muted-foreground">
                Ближайших подтверждённых записей нет. <Link to="/feed" className="underline">Найти встречу</Link>
              </p>
            )}
            {m.goingItems.map((reg, i) => <TicketRow key={reg.id} reg={reg} index={i} />)}
          </>
        ) : (
          <>
            {m.pendingItems.length === 0 && !m.pending.isPending && (
              <p className="text-sm font-semibold text-muted-foreground">
                Заявок в ожидании нет. Записи по заявке появятся здесь, пока организатор их не рассмотрит.
              </p>
            )}
            {m.pendingItems.map((reg) => <PendingRow key={reg.id} reg={reg} />)}
          </>
        )}
      </div>
    </Card>
  );
}

function Goal() {
  return (
    <Card className="absolute top-[335px] left-[721px] h-[291px] w-[495px] justify-between overflow-hidden bg-secondary p-[26px]">
      <Img src="memphis2.svg" className="top-0 right-0 h-[220px] w-[200px]" />
      <Img src="jump.png" className="top-[60px] right-[40px] h-[150px] w-[139px] object-cover" />
      <div className="relative h-[69px] w-[134px]">
        <Eyebrow className="text-foreground">ЦЕЛЬ НЕДЕЛИ</Eyebrow>
        <p className="absolute top-[19px] left-0 font-display font-extrabold whitespace-nowrap text-foreground">
          <span className="text-[44px] leading-[44px]">4</span>
          <span className="text-[20px] leading-[44px]"> / 5</span>
        </p>
      </div>
      <div className="relative h-14 w-[240px]">
        <p className="w-[120.5px] text-[13px] leading-[18px] font-bold text-foreground">ещё одна — и цель закрыта</p>
        <Progress value={80} className="absolute top-11 left-0 h-3" />
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
          <Plans m={m} />
          <Goal />
        </div>
      </main>
    </div>
    </>
  );
}
