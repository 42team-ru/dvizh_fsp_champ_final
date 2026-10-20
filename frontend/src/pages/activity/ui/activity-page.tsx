import { BlogPrompt } from "@/widgets/blog-prompt/ui/blog-prompt";
import { NotificationSettingsButton } from "@/features/notification-settings/ui/notification-settings-dialog";
import { BellRing, Hourglass, Ticket } from "lucide-react";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Link } from "react-router";
import { ActivityMobile } from "./activity-mobile";
import { PendingRow, PlansDialog, PlansSwitch, TicketRow, viewOf } from "./activity-parts";
import { useActivity, type ActivityModel } from "../model/use-activity";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Disc } from "@/shared/components/ui/disc";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Icon } from "@/shared/components/ui/icon";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import { MyEventsMap } from "@/widgets/events-map/ui/my-events-map";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { plural } from "@/shared/lib/plural";
import { InviteActions, usePendingInvites } from "@/features/organizer-invite/ui/invite-actions";

const XS = "h-9 px-4 text-[13px] leading-[18px]";


/** Кружок «не прочитано»: нажатие помечает уведомление прочитанным. Область нажатия больше самой точки. */
function Dot({ onRead }: { onRead(): void }) {
  return (
    <button type="button" onClick={onRead} aria-label="Пометить прочитанным" title="Пометить прочитанным"
      className="group -m-2 flex size-[26px] shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ink">
      <span className="box-border size-[10px] rounded-[5px] border border-ink bg-accent transition-transform group-hover:scale-150" />
    </button>
  );
}

function IconSquare({ tone, icon: Glyph }: { tone: string; icon: LucideIcon }) {
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-ink", tone)}>
      <Glyph aria-hidden className="size-5 text-foreground" strokeWidth={2.4} />
    </span>
  );
}

function FilterBar({ m }: { m: ActivityModel }) {
  return (
    <div className="flex w-[1216px] shrink-0 flex-col gap-4">
      <h1 className="font-display text-[40px] leading-[50px] font-extrabold tracking-[-1px] whitespace-nowrap text-foreground">
        Активность
      </h1>
      <div className="flex gap-2" role="tablist" aria-label="Тип активности">
        {m.tabs.map((t) => {
          const active = m.tab === t.key;
          const unread = m.unreadOf(t.key);
          return (
            <Button key={t.key} role="tab" aria-selected={active} variant={active ? "ink" : "soft"} size="chip"
              className={cn("flex-1 gap-2", active && "hover:translate-x-0 hover:translate-y-0")} onClick={() => m.setTab(t.key)}>
              {t.label}
              {t.key !== "all" && unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-[10px] bg-accent px-1 text-[11px] leading-[15px] font-extrabold text-white">
                  {unread}
                </span>
              )}
            </Button>
          );
        })}
        <NotificationSettingsButton className="h-[38px] min-h-0 flex-[1.5] px-4" />
      </div>
    </div>
  );
}

/** Лента: уведомления выбранного типа по дням. */
function Feed({ m }: { m: ActivityModel }) {
  const invites = usePendingInvites();
  return (
    <Card className="absolute top-0 left-0 h-[626px] w-[701px] overflow-hidden">
      <div className="absolute inset-y-0 left-6 right-6 flex flex-col gap-[10px] overflow-y-auto py-6 pr-1">
            {m.list.isPending && <p className="text-[15px] font-medium text-muted-foreground">Загружаем…</p>}
            {m.list.isError && <p role="alert" className="text-[15px] font-medium text-destructive">Не удалось загрузить активность.</p>}
            {m.list.isSuccess && m.groups.length === 0 && (
              <EmptyState icon={BellRing} tone="bg-sky" title="Здесь пока тихо"
                text={m.participant
                  ? "Ответы в обсуждениях, новые достижения и напоминания о встречах появятся тут."
                  : "Вопросы участников в обсуждениях ваших мероприятий появятся тут."}
                action={m.participant && (
                  <Button asChild>
                    <Link to="/feed">Записаться на встречу</Link>
                  </Button>
                )} />
            )}
            {m.groups.map((group) => (
              <section key={group.label} className="flex flex-col gap-[10px]">
                <Eyebrow className="mt-1">{group.label}</Eyebrow>
                {group.items.map((n) => {
                  const v = viewOf(n);
                  const invite = n.type === "ORGANIZER_INVITED" && n.eventId && invites.has(n.eventId) ? n.eventId : null;
                  return (
                    // строка целиком открывает уведомление; кнопки и кружок «прочитано» лежат поверх ссылки
                    <div key={n.id}
                      className={cn("relative box-border flex min-h-[76px] w-full shrink-0 items-center gap-[14px] rounded-[18px] border-2 border-ink px-[18px] py-3 transition-colors hover:bg-muted",
                        n.readAt ? "bg-card" : "bg-lime-soft")}>
                      <Link to={v.href} onClick={() => m.markRead(n)} aria-label="Открыть уведомление"
                        className="absolute inset-0 rounded-[16px] focus-visible:outline-2 focus-visible:outline-ink" />
                      {v.actor
                        ? <Disc initials={(v.actor.firstName?.[0] ?? "") + (v.actor.lastName?.[0] ?? "")} user={v.actor} tone="bg-sky"
                            className="size-11 shrink-0" textClassName="text-sm leading-[19px] tracking-[-0.5px]" />
                        : <IconSquare tone={v.tone} icon={v.icon} />}
                      <div className="min-w-0 flex-1 text-[15px] leading-[22px] font-medium text-foreground line-clamp-2">{v.text}</div>
                      {invite ? (
                        <InviteActions eventId={invite} compact className="relative z-10" />
                      ) : (
                        <Button asChild variant={n.type === "ACHIEVEMENT_UNLOCKED" ? "secondary" : "soft"} className={cn(XS, "relative z-10 shrink-0")}>
                          <Link to={v.href} onClick={() => m.markRead(n)}>{v.action}</Link>
                        </Button>
                      )}
                      {!n.readAt && <span className="relative z-10"><Dot onRead={() => m.markRead(n)} /></span>}
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
    // Отступ 17px со всех сторон; содержимое тянется на ширину карточки, без абсолютных координат.
    <Card className="absolute top-0 left-[721px] h-[315px] w-[495px] gap-[19px] overflow-hidden p-[17px]">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <PlansSwitch tab={m.plansTab} totals={totals} onChange={m.setPlansTab} />
        <PlansDialog initialTab={m.plansTab} totals={totals}>
          {/* Высота в px, как у переключателя: шапка не растёт от размера шрифта браузера и не выталкивает талоны. */}
          <Button variant="secondary" className="h-[38px] px-4 text-[13px] leading-[18px]">Все</Button>
        </PlansDialog>
      </div>
      <div className="flex min-h-0 w-full flex-col gap-[12px]">
        {m.plansTab === "going" ? (
          <>
            {m.goingItems.length === 0 && !m.going.isPending && (
              <EmptyState size="sm" icon={Ticket} bublik="ticket" tone="bg-accent" title="Билетов пока нет"
                text="Запишитесь на первую встречу — билет появится здесь."
                action={
                  <Button asChild size="sm">
                    <Link to="/feed">Найти встречу</Link>
                  </Button>
                } />
            )}
            {m.goingItems.map((reg, i) => <TicketRow key={reg.id} reg={reg} index={i} />)}
          </>
        ) : (
          <>
            {m.pendingItems.length === 0 && !m.pending.isPending && (
              <EmptyState size="sm" icon={Hourglass} tone="bg-secondary" title="Заявок в ожидании нет"
                text="Записи по заявке появятся здесь, пока организатор их не рассмотрит." />
            )}
            {m.pendingItems.map((reg) => <PendingRow key={reg.id} reg={reg} />)}
          </>
        )}
      </div>
    </Card>
  );
}

/** Карта моих ближайших встреч: записи, заявки и то, что я веду; у клуба — на всю колонку. */
function MyMap({ full }: { full?: boolean }) {
  return (
    <Card className={cn("absolute left-[721px] w-[495px] overflow-hidden p-0", full ? "top-0 h-[626px]" : "top-[335px] h-[291px]")}>
      <MyEventsMap className="size-full" />
      <Badge variant="outline" className="pointer-events-none absolute top-3 right-3 z-[500] bg-card text-[11px] font-extrabold tracking-[1px]">
        МОИ ВСТРЕЧИ НА КАРТЕ
      </Badge>
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
        <BlogPrompt compact className="w-[1216px] empty:hidden" />
        <div className="relative h-[626px] w-[1216px] shrink-0">
          <Feed m={m} />
          {m.totalUnread > 0 && (
            <button type="button" onClick={m.markAllRead} title="Отметить всё прочитанным"
              className="absolute -top-[14px] right-[539px] z-10 rotate-[-2deg] transition-transform hover:rotate-0">
              <Badge variant="accent" className="border-2 border-ink text-[13px] leading-[18px] text-white shadow-hard-sm">
                {m.totalUnread} {plural(m.totalUnread, ["новое", "новых", "новых"])} · прочитать
              </Badge>
            </button>
          )}
          {/* билеты и заявки — только у участника; клубу карта его мероприятий на всю колонку */}
          {m.participant ? (
            <>
              <Plans m={m} />
              <MyMap />
            </>
          ) : (
            <MyMap full />
          )}
        </div>
      </main>
    </div>
    </>
  );
}
