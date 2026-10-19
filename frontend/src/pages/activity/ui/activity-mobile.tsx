import { NotificationSettingsButton } from "@/features/notification-settings/ui/notification-settings-dialog";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { BrandPlate } from "@/shared/components/ui/brand-plate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Disc } from "@/shared/components/ui/disc";
import { Icon } from "@/shared/components/ui/icon";
import { Progress } from "@/shared/components/ui/progress";
import { cn } from "cn";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { Link } from "react-router";
import { PendingRow, PlansDialog, PlansSwitch, TicketRow, viewOf } from "./activity-parts";
import { ACTIVITY_TABS, type ActivityModel } from "../model/use-activity";

const dir = "m-activity";


/** Кружок «не прочитано»: нажатие помечает уведомление прочитанным; область нажатия под палец. */
function Unread({ onRead }: { onRead(): void }) {
  return (
    <button type="button" onClick={onRead} aria-label="Пометить прочитанным"
      className="-m-3 flex size-[34px] shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ink">
      <span className="box-border size-[12px] rounded-[6px] border-[1.5px] border-ink bg-accent" />
    </button>
  );
}

/** Строка уведомления: слева значок или аватар, текст, справа кнопка. */
function Row({
  lead,
  action,
  onRead,
  children,
}: {
  lead: React.ReactNode;
  action?: React.ReactNode;
  /** Есть — уведомление не прочитано: справа кружок, нажатие помечает прочитанным. */
  onRead?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4">
      <div className="box-border flex w-full items-center gap-3 rounded-[20px] border-2 border-ink bg-card p-[14px]">
        {lead}
        <div className="min-w-0 flex-1 text-sm leading-5 font-medium text-foreground">{children}</div>
        {action}
        {onRead ? <Unread onRead={onRead} /> : null}
      </div>
    </div>
  );
}

function IconBox({ tone, icon }: { tone: string; icon: string }) {
  return (
    <span
      className={cn(
        "box-border flex size-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-ink",
        tone
      )}
    >
      <Icon name={`${dir}/${icon}`} className="size-[22px]" />
    </span>
  );
}

function Label({ children }: { children: string }) {
  return (
    <p className="px-4 text-[11px] leading-[normal] font-extrabold tracking-[1.5px] text-muted-foreground">
      {children}
    </p>
  );
}

export function ActivityMobile({ m }: { m: ActivityModel }) {
  const totals = { going: m.goingTotal, requests: m.pendingTotal };
  return (
    <div className="relative isolate flex min-h-dvh overflow-clip flex-col gap-4 bg-background pb-[110px] lg:hidden">
      <MemphisBackground variant="mobile" seed="activity" />
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <BrandPlate>
          <img src="/icon.svg" alt="" className="size-9 shrink-0" />
          <span className="font-display text-xl leading-[normal] font-bold text-foreground">
            Активность
          </span>
        </BrandPlate>
        <button
          type="button"
          aria-label="Поиск"
          className="box-border flex size-11 items-center justify-center rounded-[22px] border-2 border-ink bg-card"
        >
          <Icon name={`${dir}/icon-search`} className="size-5" />
        </button>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Тип активности">
        {ACTIVITY_TABS.map((t) => {
          const unread = m.unreadOf(t.key);
          return (
            <Button key={t.key} role="tab" aria-selected={m.tab === t.key} variant={m.tab === t.key ? "ink" : "soft"}
              rough={false} className="h-11 shrink-0 gap-2 px-[18px] text-sm shadow-none" onClick={() => m.setTab(t.key)}>
              {t.label}
              {t.key !== "all" && unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-[10px] bg-accent px-1 text-[11px] font-extrabold text-white">{unread}</span>
              )}
            </Button>
          );
        })}
        <NotificationSettingsButton className="h-11 shrink-0 px-[18px]" />
      </div>

      {m.totalUnread > 0 && (
        <div className="px-4">
          <Button variant="ghost" size="sm" onClick={m.markAllRead}>Отметить всё прочитанным ({m.totalUnread})</Button>
        </div>
      )}

      <>
          {m.list.isPending && <p className="px-4 text-sm font-medium text-muted-foreground">Загружаем…</p>}
          {m.list.isSuccess && m.groups.length === 0 && (
            <p className="px-4 text-sm font-medium text-muted-foreground">Здесь пока пусто: ответы, достижения и напоминания появятся тут.</p>
          )}
          {m.groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-3">
              <Label>{group.label}</Label>
              {group.items.map((n) => {
                const v = viewOf(n);
                return (
                  <Row key={n.id} onRead={n.readAt ? undefined : () => m.markRead(n)}
                    lead={v.actor
                      ? <Disc initials={(v.actor.firstName?.[0] ?? "") + (v.actor.lastName?.[0] ?? "")} user={v.actor} tone="bg-sky"
                          className="size-11 shrink-0" textClassName="text-[13px] leading-[normal]" />
                      : <IconBox tone={v.tone} icon={v.icon} />}
                    action={
                      <Button asChild variant="soft" className="h-10 shrink-0 px-4 text-xs">
                        <Link to={v.href} onClick={() => m.markRead(n)}>{v.action}</Link>
                      </Button>
                    }>
                    {v.text}
                  </Row>
                );
              })}
            </div>
          ))}
          {m.hasMore && <div className="px-4"><Button variant="soft" className="w-full" onClick={m.showMore}>Показать ещё</Button></div>}
      </>

      <div className="px-4">
        <div className="box-border flex w-full flex-col gap-3 rounded-[24px] border-2 border-ink bg-card p-[14px]">
          <div className="no-scrollbar overflow-x-auto">
            <PlansSwitch tab={m.plansTab} totals={totals} onChange={m.setPlansTab} />
          </div>
          {m.plansTab === "going" ? (
            <>
              {m.goingItems.length === 0 && !m.going.isPending && (
                <p className="text-sm font-medium text-muted-foreground">Ближайших подтверждённых записей нет.</p>
              )}
              {m.goingItems.map((reg, i) => <TicketRow key={reg.id} reg={reg} index={i} compact />)}
            </>
          ) : (
            <>
              {m.pendingItems.length === 0 && !m.pending.isPending && (
                <p className="text-sm font-medium text-muted-foreground">Заявок в ожидании нет.</p>
              )}
              {m.pendingItems.map((reg) => <PendingRow key={reg.id} reg={reg} />)}
            </>
          )}
          <PlansDialog initialTab={m.plansTab} totals={totals} compact>
            <Button variant="secondary" className="h-11 w-full text-sm">Смотреть все</Button>
          </PlansDialog>
        </div>
      </div>

      <div className="px-4">
        <div className="box-border flex w-full items-center gap-2 overflow-hidden rounded-[24px] border-2 border-ink bg-secondary p-[18px] shadow-[4px_4px_0_var(--ink)]">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-[6px] text-foreground">
            <span className="text-[10px] leading-[normal] font-extrabold tracking-[1.5px] whitespace-nowrap">
              ЦЕЛЬ НЕДЕЛИ
            </span>
            <span className="font-display text-[32px] leading-[normal] font-extrabold whitespace-nowrap">
              4 / 5
            </span>
            <span className="text-[13px] leading-[normal] font-bold whitespace-nowrap">
              ещё одна — и цель закрыта
            </span>
            <Progress value={80} className="w-[170px] bg-card" />
          </div>
          <img src="/m-home/img.png" alt="" className="h-28 w-[104px] shrink-0 object-contain" />
        </div>
      </div>

      <MobileTabBar current="activity" />
    </div>
  );
}
