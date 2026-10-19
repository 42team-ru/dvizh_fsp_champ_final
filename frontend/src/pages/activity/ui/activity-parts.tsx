import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import type { MyRegistrationResponse, NotificationResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { CancelledStamp } from "@/shared/components/ui/cancelled-stamp";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Icon } from "@/shared/components/ui/icon";
import { QrCode } from "@/shared/components/ui/qr-code";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { REGISTRATION_STATUS } from "@/shared/lib/statuses";
import { cn } from "cn";
import { PLANS_TABS, shortTime, usePlansPage, type PlansTab } from "../model/use-activity";

const MONTHS = ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЙ", "ИЮН", "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"];
const TICKET_TONES = ["bg-accent", "bg-primary"];

const b = "font-extrabold";
const time = (iso: string) => <span className="text-muted-foreground"> · {shortTime(iso)}</span>;
const fullName = (u: NonNullable<NotificationResponse["actor"]>) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username;

/** Как показать уведомление: значок или автор, текст, кнопка и куда она ведёт. */
export type NotificationView = {
  /** Автор (ответ в обсуждении) — аватар; иначе значок. */
  actor?: NotificationResponse["actor"];
  icon: "icon-clock" | "icon-trophy" | "icon-bell";
  tone: string;
  text: ReactNode;
  action: string;
  href: string;
};

/** Текст под тип: ответ — кто и что написал, достижение — название и награда, напоминание — встреча и время. */
export function viewOf(n: NotificationResponse): NotificationView {
  const [first, ...rest] = n.body.split("\n");
  const second = rest.join(" ");
  switch (n.type) {
    case "COMMENT_REPLY":
    case "COMMENT_CREATED":
      return {
        actor: n.actor, icon: "icon-bell", tone: "bg-sky-soft", action: "Ответить", href: `${n.targetPath}#event-chat`,
        text: (
          <>
            <span className={b}>{n.actor ? fullName(n.actor) : "Участник"}</span>
            {n.type === "COMMENT_REPLY" ? " ответил(а) вам" : " спрашивает"} в <span className={b}>«{first}»</span>
            {second && <>: «{second}»</>}
            {time(n.createdAt)}
          </>
        ),
      };
    case "ACHIEVEMENT_UNLOCKED": {
      const name = /«(.+)»/.exec(n.title)?.[1] ?? n.title;
      const reward = /Награда: (.+)$/.exec(n.body)?.[1];
      return {
        icon: "icon-trophy", tone: "bg-secondary", action: "Смотреть", href: n.targetPath,
        text: (
          <>
            Новое достижение <Badge variant="secondary" className="mx-1 h-6 align-middle">{name}</Badge>
            {reward && <span className="font-bold"> {reward}</span>}
            {time(n.createdAt)}
          </>
        ),
      };
    }
    case "REMINDER":
      return {
        icon: "icon-clock", tone: "bg-lavender-soft", action: "Открыть", href: n.targetPath,
        text: <><span className={b}>{n.title}</span>{n.body && <>: {n.body.replace(/\n/g, " · ")}</>}{time(n.createdAt)}</>,
      };
    default:
      return {
        icon: "icon-bell", tone: "bg-card", action: "Открыть", href: n.targetPath,
        text: <><span className={b}>{n.title}</span>{first && <>: {first}</>}{time(n.createdAt)}</>,
      };
  }
}

/** Заявка в ожидании: встреча, когда, сколько ждёт; ссылка на карточку. */
export function PendingRow({ reg }: { reg: MyRegistrationResponse }) {
  const start = reg.myNextOccurrence?.startAt ?? reg.event.startAt;
  return (
    <Link to={`/events/${reg.event.id}`}
      className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-card px-4 py-3 hover:bg-muted">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-extrabold">{reg.event.title}</span>
        <span className="block truncate text-xs font-semibold text-muted-foreground">
          {reg.event.sport.name} · {new Date(start).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
          {" · заявка от "}{shortTime(reg.createdAt)}
        </span>
      </span>
      <span className={`shrink-0 rounded-pill border-2 border-ink px-3 py-1 text-xs font-extrabold ${REGISTRATION_STATUS.PENDING.tone}`}>
        {REGISTRATION_STATUS.PENDING.label}
      </span>
    </Link>
  );
}

/** Подтверждённая запись как посадочный талон: дата, встреча, место; у отменённой — штамп отмены. `compact` — без колонки с QR (узкий экран). */
export function TicketRow({ reg, index, compact }: { reg: MyRegistrationResponse; index: number; compact?: boolean }) {
  const start = new Date(reg.myNextOccurrence?.startAt ?? reg.event.startAt);
  const cancelled = reg.event.cancelledByOrganizer || reg.event.status !== "PUBLISHED";
  return (
    <Link to={`/events/${reg.event.id}`}
      className="relative box-border flex h-[104px] w-full shrink-0 items-stretch overflow-hidden rounded-[18px] border-2 border-ink bg-card">
      <div className={cn("relative w-[88px] shrink-0 border-r-2 border-dashed border-ink text-white", TICKET_TONES[index % TICKET_TONES.length])}>
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
      {!compact && (
        <div className="relative w-[104px] shrink-0 overflow-hidden border-l-2 border-dashed border-ink bg-secondary">
          {!cancelled && (
            <QrCode path={`/events/${reg.event.id}`} label="QR-код: страница встречи" className="absolute top-[8px] left-[26px] size-[52px]" />
          )}
          {cancelled ? (
            <CancelledStamp className="bottom-[6px] left-[10px] h-[28px] w-[84px] rotate-[7deg]" />
          ) : (
            <div className="pointer-events-none absolute bottom-[6px] left-[10px] h-[28px] w-[84px] rotate-[7deg] text-primary">
              <img src="/event/stamp-admitted.svg" alt="" className="absolute inset-0 size-full max-w-none" />
              <p className="absolute inset-x-0 top-[7px] text-center font-display text-[11px] leading-[14px] font-extrabold">ДОПУЩЕН</p>
            </div>
          )}
        </div>
      )}
      {compact && cancelled && <CancelledStamp className="top-[34px] right-[8px] h-[28px] w-[84px] rotate-[7deg]" />}
    </Link>
  );
}

/** Переключатель «Ты идёшь» / «Заявки» с числами в превью блока. */
export function PlansSwitch({ tab, totals, onChange }: {
  tab: PlansTab;
  totals: Record<PlansTab, number>;
  onChange(tab: PlansTab): void;
}) {
  return (
    <div className="flex gap-2" role="tablist" aria-label="Мои записи">
      {PLANS_TABS.map((t) => {
        const active = tab === t.key;
        return (
          <Button key={t.key} role="tab" aria-selected={active} variant={active ? "ink" : "soft"} size="chip"
            className={cn("gap-2", active && "hover:translate-x-0 hover:translate-y-0")} onClick={() => onChange(t.key)}>
            {t.label}
            <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-[10px] px-1 text-[11px] leading-[15px] font-extrabold",
              active ? "bg-card text-foreground" : "bg-ink text-white")}>
              {totals[t.key]}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

const EMPTY: Record<PlansTab, string> = {
  going: "Ближайших подтверждённых записей нет.",
  requests: "Заявок в ожидании нет. Записи по заявке появятся здесь, пока организатор их не рассмотрит.",
};

/** Одна вкладка окна: своя страница списка, пейджер внизу. */
function PlansPage({ tab, compact }: { tab: PlansTab; compact?: boolean }) {
  const [page, setPage] = useState(0);
  const { query, items, total, totalPages } = usePlansPage(tab, page);
  return (
    <div className="flex flex-col gap-2">
      {query.isPending && <p className="text-sm font-semibold text-muted-foreground">Загружаем…</p>}
      {query.isError && <p role="alert" className="text-sm font-semibold text-destructive">Не удалось загрузить список.</p>}
      {query.isSuccess && total === 0 && (
        <>
          <p className="text-sm font-semibold text-muted-foreground">{EMPTY[tab]}</p>
          <Button asChild variant="soft" className="self-start"><Link to="/feed">Найти встречу</Link></Button>
        </>
      )}
      {items.map((reg, i) => tab === "going"
        ? <TicketRow key={reg.id} reg={reg} index={page * 10 + i} compact={compact} />
        : <PendingRow key={reg.id} reg={reg} />)}
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <Button variant="soft" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Назад</Button>
          <span className="text-sm font-bold text-muted-foreground">Стр. {page + 1} из {totalPages}</span>
          <Button variant="soft" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Вперёд</Button>
        </div>
      )}
    </div>
  );
}

/** «Все» → полный список моих подтверждённых записей и заявок в ожидании, по вкладкам и страницам. */
export function PlansDialog({ initialTab, totals, compact, children }: {
  initialTab: PlansTab;
  totals: Record<PlansTab, number>;
  compact?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PlansTab>(initialTab);
  return (
    <Dialog open={open} onOpenChange={(next) => { if (next) setTab(initialTab); setOpen(next); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      {/* Окно не прокручивается целиком: заголовок и вкладки на месте, листается только список,
          а полоса прокрутки идёт в своём жёлобе и не наезжает на билеты. */}
      <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-[680px]">
        <DialogTitle>Мои записи</DialogTitle>
        <DialogDescription>Ближайшие встречи, куда вы идёте, и заявки, которые ждут решения организатора.</DialogDescription>
        <Tabs value={tab} onValueChange={(v) => setTab(v as PlansTab)} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="shrink-0">
            {PLANS_TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-sm">{t.label} · {totals[t.key]}</TabsTrigger>
            ))}
          </TabsList>
          {PLANS_TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="-mr-3 min-h-0 flex-1 overflow-y-auto pr-3 [scrollbar-gutter:stable]">
              {open && <PlansPage tab={t.key} compact={compact} />}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
