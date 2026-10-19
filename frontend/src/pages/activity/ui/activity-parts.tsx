import type { ReactNode } from "react";
import { Link } from "react-router";
import type { MyRegistrationResponse, NotificationResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { REGISTRATION_STATUS } from "@/shared/lib/statuses";
import { shortTime } from "../model/use-activity";

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

/** «Посмотреть» → список всех моих заявок, ждущих решения организатора. */
export function PendingDialog({ items, total, loading, children }: {
  items: MyRegistrationResponse[];
  total: number;
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogTitle>Заявки в ожидании</DialogTitle>
        <DialogDescription>
          {total === 0 ? "Сейчас нет заявок, которые ждут решения." : `Ждут решения организатора: ${total}`}
        </DialogDescription>
        {loading && <p className="text-sm font-semibold text-muted-foreground">Загружаем…</p>}
        <div className="flex flex-col gap-2">
          {items.map((reg) => <PendingRow key={reg.id} reg={reg} />)}
        </div>
        {total === 0 && (
          <Button asChild variant="soft" className="self-start"><Link to="/feed">Найти встречу</Link></Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
