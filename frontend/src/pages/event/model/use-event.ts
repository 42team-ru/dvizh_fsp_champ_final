import { useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { getEventsGetQueryKey, useEventsGet } from "@/shared/api/generated/core/events/events";
import { getCommentsListQueryKey, useCommentsCreate, useCommentsList } from "@/shared/api/generated/core/comments/comments";
import { useRegistrationsCancel, useRegistrationsCreate } from "@/shared/api/generated/core/registrations/registrations";
import type { EventResponse, UserShortResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { EVENT_KIND_LABEL, EVENT_LEVEL_LABEL, FORMAT_LABEL, JOIN_MODE_LABEL, REGISTRATION_STATUS } from "@/shared/lib/statuses";
import { plural } from "@/shared/lib/plural";
import { useUser } from "@/entity/user/model/use-user";
import { useCrowdSample } from "@/widgets/event-going-crowd/model/use-crowd-sample";

import { useCommentModeration } from "@/features/comment-moderation/model/use-comment-moderation";

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const time = (d: Date) => d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export const initials = (u: Pick<UserShortResponse, "firstName" | "lastName" | "username">) =>
  ((u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")).toUpperCase() || u.username[0]?.toUpperCase() || "?";
export const fullName = (u: Pick<UserShortResponse, "firstName" | "lastName" | "username">) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username;

/**
 * Что показать в блоке «детали для участников»: сами детали, если они видны и заполнены, иначе понятное
 * объяснение по ситуации — участник, организатор, заявка ждёт решения, записаться нельзя или можно.
 */
export function privateNote(event: EventResponse): string {
  const v = event.viewer;
  const details = [event.privateDetails, event.format === "ONLINE" ? event.onlineUrl : undefined].filter(Boolean).join(" · ");
  if (v.canSeePrivateDetails) {
    if (details) return details;
    return v.isOrganizer
      ? "Деталей для участников нет — добавьте точное место или ссылку на чат в событии"
      : "Вы участник. Организатор не оставил доп. деталей — вопросы задавайте в обсуждении";
  }
  if (v.registrationStatus === "PENDING") return "Заявка на рассмотрении — детали появятся после одобрения";
  if (v.registrationStatus === "REJECTED") return "Детали видят только участники встречи";
  if (!v.canRegister) return "Детали видят только участники встречи";
  return "Запишись — и здесь появятся детали для участников";
}

/**
 * Короткое название места для крупной строки билета: без уточнения в скобках и без города в начале.
 * «Красноярск, Метрополь, деловой центр (…)» → «Метрополь»; «Красноярск, улица Ленина, 113» → «улица Ленина».
 */
export function placeName(address?: string) {
  const parts = (address ?? "").replace(/\s*\([^)]*\)/g, "").split(",").map((p) => p.trim()).filter(Boolean);
  return parts[1] ?? parts[0] ?? "Адрес";
}

/** Строка статуса отклонённой заявки с причиной организатора, если она есть. */
export const rejectedText = (reason?: string) => `Заявка отклонена${reason ? `: «${reason}»` : ""}`;

/** Факты для шапки-билета: когда, где, запись. */
function facts(event: EventResponse) {
  const start = new Date(event.nextOccurrence?.startAt ?? event.startAt);
  const endIso = event.nextOccurrence?.endAt ?? event.endAt;
  // считаем календарные дни, а не сутки: встреча завтра в 19:00 — «завтра», даже если до неё 30 часов
  const today = new Date();
  const days = Math.round(
    (new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000,
  );
  const when = days <= 0 ? "сегодня" : days === 1 ? "завтра" : `через ${days} ${plural(days, ["день", "дня", "дней"])}`;
  return [
    {
      section: "when" as const, icon: "icon-clock", label: "КОГДА",
      value: `${WEEKDAYS[start.getDay()]}, ${start.getDate()} ${MONTHS[start.getMonth()]}`,
      lines: [endIso ? `${time(start)}–${time(new Date(endIso))}` : time(start), event.schedule?.description ?? when],
    },
    {
      section: "where" as const, icon: "icon-pin", label: "ГДЕ",
      value: event.format === "ONLINE" ? FORMAT_LABEL.ONLINE : placeName(event.address),
      lines: event.format === "ONLINE" ? ["ссылка — после записи", ""] : [event.address ?? "", event.locationNote ?? ""],
    },
    {
      section: "registration" as const, icon: "icon-route", label: "ЗАПИСЬ",
      value: JOIN_MODE_LABEL[event.joinMode],
      lines: [
        event.capacity != null ? `мест: ${event.capacity}` : "без лимита мест",
        event.minParticipants != null ? `состоится от ${event.minParticipants}` : EVENT_LEVEL_LABEL[event.level],
      ],
    },
  ];
}

/** Карточка мероприятия: данные, обсуждение и действия. Кнопки рисуются по блоку viewer (правило 8). */
export function useEvent() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const moderation = useCommentModeration(id);
  const query = useEventsGet(id);
  const event = query.data?.status === 200 ? query.data.data : undefined;
  const { user } = useUser();
  const crowd = useCrowdSample(event?.participants ?? [], user?.id);
  const comments = useCommentsList(id, undefined, { query: { enabled: Boolean(event), refetchInterval: 15_000 } });

  const refresh = () => queryClient.invalidateQueries({ queryKey: getEventsGetQueryKey(id) });
  const register = useRegistrationsCreate({ mutation: { onSuccess: refresh } });
  const cancel = useRegistrationsCancel({ mutation: { onSuccess: refresh } });
  const comment = useCommentsCreate({ mutation: {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getCommentsListQueryKey(id) }),
  } });

  const viewer = event?.viewer;
  const status = viewer?.registrationStatus ? REGISTRATION_STATUS[viewer.registrationStatus] : undefined;
  const going = event ? event.participantsCount : 0;
  const organizerName = event ? event.organization?.name ?? fullName(event.author) : "";

  return {
    id,
    moderation,
    query,
    event,
    comments: comments.data?.status === 200 ? comments.data.data : [],
    facts: event ? facts(event) : [],
    kindLabel: event?.kind ? EVENT_KIND_LABEL[event.kind] : "Встреча",
    levelLabel: event ? EVENT_LEVEL_LABEL[event.level] : "",
    joinLabel: event ? JOIN_MODE_LABEL[event.joinMode] : "",
    organizerName,
    going,
    crowd,
    percent: event?.capacity ? Math.min(100, Math.round((going / event.capacity) * 100)) : 100,
    status,
    /** Снято или удалено: красная плашка вместо записи (правило 5). */
    moderated: event && event.status !== "PUBLISHED"
      ? { title: event.status === "DELETED" ? "Удалено" : "Снято с публикации", reason: event.moderationReason }
      : undefined,
    register: () => register.mutate({ id, data: {} }),
    cancel: () => cancel.mutate({ id }),
    sendComment: (text: string, replyToId?: string) => comment.mutateAsync({ id, data: { text, replyToId } }),
    busy: register.isPending || cancel.isPending,
    actionError: register.error?.detail ?? cancel.error?.detail,
    commentError: comment.error?.detail,
    commentPending: comment.isPending,
  };
}
