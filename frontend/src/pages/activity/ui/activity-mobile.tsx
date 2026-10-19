import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { BrandPlate } from "@/shared/components/ui/brand-plate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Disc } from "@/shared/components/ui/disc";
import { Icon } from "@/shared/components/ui/icon";
import { cn } from "cn";
import { MyEventsMap } from "@/widgets/events-map/ui/my-events-map";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { Link } from "react-router";
import { PendingDialog, PendingRow, viewOf } from "./activity-parts";
import { type ActivityModel } from "../model/use-activity";

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
        {m.tabs.map((t) => {
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
      </div>

      {m.totalUnread > 0 && m.tab !== "requests" && (
        <div className="px-4">
          <Button variant="ghost" size="sm" onClick={m.markAllRead}>Отметить всё прочитанным ({m.totalUnread})</Button>
        </div>
      )}

      {m.tab === "requests" ? (
        <>
          <Label>ЖДУТ РЕШЕНИЯ ОРГАНИЗАТОРА</Label>
          {m.pendingItems.length === 0 && !m.pending.isPending && (
            <p className="px-4 text-sm font-medium text-muted-foreground">Заявок в ожидании нет.</p>
          )}
          {m.pendingItems.map((reg) => <div key={reg.id} className="px-4"><PendingRow reg={reg} /></div>)}
        </>
      ) : (
        <>
          {m.list.isPending && <p className="px-4 text-sm font-medium text-muted-foreground">Загружаем…</p>}
          {m.list.isSuccess && m.groups.length === 0 && (
            <p className="px-4 text-sm font-medium text-muted-foreground">{m.participant
              ? "Здесь пока пусто: ответы, достижения и напоминания появятся тут."
              : "Здесь пока пусто: вопросы участников в обсуждениях появятся тут."}</p>
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
      )}

      {m.participant && <div className="px-4">
        <div className="box-border flex w-full items-center justify-between gap-3 rounded-[24px] border-2 border-ink bg-primary p-[18px] text-white">
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold tracking-[1.5px] text-lilac">ЗАЯВКИ</span>
            <p className="font-display text-[32px] leading-[normal] font-extrabold">{m.pendingTotal}</p>
            <p className="truncate text-[13px] font-bold">{m.pendingItems[0] ? `ждёт ответа: «${m.pendingItems[0].event.title}»` : "нет заявок в ожидании"}</p>
          </div>
          <PendingDialog items={m.pendingItems} total={m.pendingTotal} loading={m.pending.isPending}>
            <Button variant="secondary" className="h-10 shrink-0 px-4 text-sm">Посмотреть</Button>
          </PendingDialog>
        </div>
      </div>}

      <div className="px-4">
        <div className="box-border flex w-full flex-col overflow-hidden rounded-[24px] border-2 border-ink bg-card shadow-[4px_4px_0_var(--ink)]">
          <span className="px-[18px] pt-[14px] pb-2 text-[10px] leading-[normal] font-extrabold tracking-[1.5px] text-foreground">
            МОИ ВСТРЕЧИ НА КАРТЕ
          </span>
          <MyEventsMap className="h-[260px] w-full border-t-2 border-ink" />
        </div>
      </div>

      <MobileTabBar current="activity" />
    </div>
  );
}
