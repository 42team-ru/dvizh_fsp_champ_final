import { useState } from "react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import {
  getNotificationsListQueryKey, getNotificationsUnreadCountsQueryKey, useNotificationsList, useNotificationsRead,
  useNotificationsReadAll,
} from "@/shared/api/generated/core/notifications/notifications";
import {
  ACHIEVEMENT_TYPES, ACTIVITY_TYPES, REMINDER_TYPES, REPLY_TYPES, TEAM_TYPES, useUnreadNotifications,
} from "@/entity/notification/model/use-unread-notifications";
import { useRegistrationsMine } from "@/shared/api/generated/core/registrations/registrations";
import type { NotificationResponse, NotificationsListTypesItem, RegistrationsMineStatus } from "@/shared/api/generated/core/appAPI.schemas";
import { useUser } from "@/entity/user/model/use-user";

/** Вкладки ленты активности: каждая — свой набор типов уведомлений. */
export type ActivityTab = "all" | "replies" | "achievements" | "reminders";

export const ACTIVITY_TABS: { key: ActivityTab; label: string; types: NotificationsListTypesItem[] }[] = [
  { key: "all", label: "Все", types: ACTIVITY_TYPES },
  { key: "replies", label: "Ответы", types: REPLY_TYPES },
  { key: "achievements", label: "Достижения", types: ACHIEVEMENT_TYPES },
  { key: "reminders", label: "Напоминания", types: REMINDER_TYPES },
];

/** Вкладки блока «Мои планы»: подтверждённые записи и заявки, ждущие решения организатора. */
export type PlansTab = "going" | "requests";

export const PLANS_TABS: { key: PlansTab; label: string; status: RegistrationsMineStatus }[] = [
  { key: "going", label: "Ты идёшь", status: "CONFIRMED" },
  { key: "requests", label: "Заявки", status: "PENDING" },
];

const PLANS_PAGE = 10;

const STEP = 30;
const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** «Сегодня», «Вчера», иначе «18 октября». */
export function dayLabel(iso: string) {
  const day = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  if (day === today) return "СЕГОДНЯ";
  if (day === today - DAY) return "ВЧЕРА";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }).toUpperCase();
}

/** Время для строки: сегодня — «14:36», раньше — «18 окт». */
export function shortTime(iso: string) {
  const d = new Date(iso);
  return startOfDay(d) === startOfDay(new Date())
    ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

/**
 * Данные «Активности»: уведомления по вкладкам (ответы, достижения, напоминания), счётчики непрочитанного,
 * превью ближайших подтверждённых записей («Ты идёшь») и заявок в ожидании. Обновляется раз в 30 секунд.
 */
export function useActivity() {
  const cache = useQueryClient();
  const { user } = useUser();
  /** Достижения, напоминания, мои заявки и билеты есть только у участника; клубу остаются ответы в обсуждениях. */
  const participant = user?.systemRole === "USER";
  const tabs = participant ? ACTIVITY_TABS : ACTIVITY_TABS.filter((t) => t.key === "all" || t.key === "replies");
  const [tab, setTabState] = useState<ActivityTab>("all");
  const [size, setSize] = useState(STEP);
  const [plansTab, setPlansTab] = useState<PlansTab>("going");
  // у клуба «Все» — вопросы и ответы в обсуждениях и приглашения в команду организаторов
  const types = participant ? ACTIVITY_TABS.find((t) => t.key === tab)?.types
    : tab === "replies" ? REPLY_TYPES : [...REPLY_TYPES, ...TEAM_TYPES];

  const unread = useUnreadNotifications();
  const list = useNotificationsList({ types, size }, {
    query: { placeholderData: keepPreviousData, refetchInterval: 30_000 },
  });
  const pending = useRegistrationsMine({ status: "PENDING", when: "UPCOMING", size: 2 }, { query: { enabled: participant } });
  const going = useRegistrationsMine({ status: "CONFIRMED", when: "UPCOMING", size: 2 }, { query: { enabled: participant } });
  /** Отменённые организатором или снятые: будущих занятий у них нет, поэтому в UPCOMING не попадают. */
  const confirmed = useRegistrationsMine({ status: "CONFIRMED", size: 20 }, { query: { enabled: participant } });

  const page = list.data?.status === 200 ? list.data.data : undefined;
  const items: NotificationResponse[] = page?.items ?? [];
  const pendingItems = pending.data?.status === 200 ? pending.data.data.items ?? [] : [];
  const pendingTotal = pending.data?.status === 200 ? pending.data.data.totalElements ?? pendingItems.length : 0;
  const cancelledItems = (confirmed.data?.status === 200 ? confirmed.data.data.items ?? [] : []).filter(
    (r) => (r.event.cancelledByOrganizer || r.event.status === "UNPUBLISHED") && new Date(r.event.startAt).getTime() > Date.now(),
  );
  /** Билеты: сначала действующие, свободные места — отменённые со штампом. */
  const goingItems = [...(going.data?.status === 200 ? going.data.data.items ?? [] : []), ...cancelledItems].slice(0, 2);
  const goingTotal = going.data?.status === 200 ? going.data.data.totalElements ?? goingItems.length : 0;

  const unreadOf = (key: ActivityTab) =>
    unread.unreadOf((participant ? ACTIVITY_TABS.find((t) => t.key === key)?.types : REPLY_TYPES) ?? []);

  // Лента по дням: «СЕГОДНЯ», «ВЧЕРА», дальше датой.
  const groups: { label: string; items: NotificationResponse[] }[] = [];
  for (const n of items) {
    const label = dayLabel(n.createdAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }

  const refresh = () => {
    void cache.invalidateQueries({ queryKey: getNotificationsListQueryKey() });
    void cache.invalidateQueries({ queryKey: getNotificationsUnreadCountsQueryKey() });
  };
  const read = useNotificationsRead({ mutation: { onSuccess: refresh } });
  const readAll = useNotificationsReadAll({ mutation: { onSuccess: refresh } });

  return {
    participant,
    tabs,
    tab,
    setTab: (next: ActivityTab) => { setTabState(next); setSize(STEP); },
    unreadOf,
    totalUnread: participant ? unread.total : unread.unreadOf(REPLY_TYPES),
    list,
    groups,
    hasMore: page?.nextCursor != null && size < 100,
    showMore: () => setSize((s) => Math.min(100, s + STEP)),
    /** Отметить прочитанным при переходе по уведомлению; уже прочитанные не трогаем. */
    markRead: (n: NotificationResponse) => { if (!n.readAt) read.mutate({ id: n.id }); },
    markAllRead: () => { if (page) readAll.mutate({ data: { throughRevision: page.revision } }); },
    plansTab,
    setPlansTab,
    pending,
    pendingItems,
    pendingTotal,
    going,
    goingItems,
    goingTotal,
  };
}

export type ActivityModel = ReturnType<typeof useActivity>;

/** Страница полного списка «Ты идёшь» или «Заявки» для окна «Все»: по 10 на страницу. */
export function usePlansPage(tab: PlansTab, page: number) {
  const status = PLANS_TABS.find((t) => t.key === tab)!.status;
  const query = useRegistrationsMine({ status, when: "UPCOMING", page, size: PLANS_PAGE }, {
    query: { placeholderData: keepPreviousData },
  });
  const data = query.data?.status === 200 ? query.data.data : undefined;
  return {
    query,
    items: data?.items ?? [],
    total: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0,
  };
}
