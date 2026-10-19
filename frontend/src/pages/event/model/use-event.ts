import { useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { getEventsGetQueryKey, useEventsGet } from "@/shared/api/generated/core/events/events";
import { getCommentsListQueryKey, useCommentsCreate, useCommentsList } from "@/shared/api/generated/core/comments/comments";
import { useRegistrationsCancel, useRegistrationsCreate } from "@/shared/api/generated/core/registrations/registrations";
import type { EventResponse, UserShortResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { EVENT_KIND_LABEL, EVENT_LEVEL_LABEL, FORMAT_LABEL, JOIN_MODE_LABEL, REGISTRATION_STATUS } from "@/shared/lib/statuses";
import { plural } from "@/pages/profile/model/use-profile";

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const time = (d: Date) => d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export const initials = (u: Pick<UserShortResponse, "firstName" | "lastName" | "username">) =>
  ((u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")).toUpperCase() || u.username[0]?.toUpperCase() || "?";
export const fullName = (u: Pick<UserShortResponse, "firstName" | "lastName" | "username">) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username;

/** Факты для шапки-билета: когда, где, запись. */
function facts(event: EventResponse) {
  const start = new Date(event.nextOccurrence?.startAt ?? event.startAt);
  const endIso = event.nextOccurrence?.endAt ?? event.endAt;
  const days = Math.ceil((start.getTime() - Date.now()) / 86_400_000);
  const when = days <= 0 ? "сегодня" : days === 1 ? "завтра" : `через ${days} ${plural(days, ["день", "дня", "дней"])}`;
  return [
    {
      icon: "icon-clock", label: "КОГДА",
      value: `${WEEKDAYS[start.getDay()]}, ${start.getDate()} ${MONTHS[start.getMonth()]}`,
      lines: [endIso ? `${time(start)}–${time(new Date(endIso))}` : time(start), event.schedule?.description ?? when],
    },
    {
      icon: "icon-pin", label: "ГДЕ",
      value: event.format === "ONLINE" ? FORMAT_LABEL.ONLINE : event.address?.split(",").slice(-1)[0]?.trim() || "Адрес",
      lines: event.format === "ONLINE" ? ["ссылка — после записи", ""] : [event.address ?? "", event.locationNote ?? ""],
    },
    {
      icon: "icon-route", label: "ЗАПИСЬ",
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
  const query = useEventsGet(id);
  const event = query.data?.status === 200 ? query.data.data : undefined;
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
    query,
    event,
    comments: comments.data?.status === 200 ? comments.data.data : [],
    facts: event ? facts(event) : [],
    kindLabel: event?.kind ? EVENT_KIND_LABEL[event.kind] : "Встреча",
    levelLabel: event ? EVENT_LEVEL_LABEL[event.level] : "",
    joinLabel: event ? JOIN_MODE_LABEL[event.joinMode] : "",
    organizerName,
    going,
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
