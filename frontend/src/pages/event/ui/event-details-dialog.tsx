import { useRef } from "react";
import type { EventResponse, OccurrenceResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { getEventsCalendarUrl } from "@/shared/api/generated/core/events/events";
import { useOccurrencesList } from "@/shared/api/generated/core/occurrences/occurrences";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { EVENT_LEVEL_LABEL, JOIN_MODE_LABEL, OCCURRENCE_STATUS_LABEL, QUORUM_STATUS_LABEL } from "@/shared/lib/statuses";
import { privateNote } from "../model/use-event";

export type EventDetailsSection = "when" | "where" | "registration";

/** Полные данные билета; мобильная и настольная версии открывают одно окно. */
export function EventDetailsDialog({ event: e, section, onClose, onRestoreFocus }: {
  event: EventResponse;
  section?: EventDetailsSection;
  onClose: () => void;
  onRestoreFocus: () => void;
}) {
  const open = section !== undefined;
  const list = useOccurrencesList(e.id, undefined, { query: { enabled: open && e.recurring } });
  const occurrences = list.data?.status === 200 ? list.data.data : undefined;
  const upcoming = occurrences?.filter((o) => new Date(o.startAt).getTime() >= Date.now())
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  const nearest = e.recurring ? upcoming?.find((o) => o.id === e.nextOccurrence?.id) : e.singleOccurrence;
  const start = e.nextOccurrence?.startAt ?? e.startAt;
  const end = e.nextOccurrence ? e.nextOccurrence.endAt : e.endAt;
  const timeZone = e.schedule?.timeZone;
  const dateTime = (iso: string) => new Date(iso).toLocaleString("ru-RU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone,
  });
  const duration = (from: string, to?: string) => {
    if (!to) return "Длительность не указана";
    const minutes = Math.round((Date.parse(to) - Date.parse(from)) / 60_000);
    return `Длительность: ${minutes >= 60 ? `${Math.floor(minutes / 60)} ч ` : ""}${minutes % 60 ? `${minutes % 60} мин` : ""}`.trim();
  };
  const capacity = nearest?.capacity ?? e.capacity;
  // Число принятых в серию не равно числу отметок на конкретное занятие.
  const count = e.recurring ? nearest?.attendeesCount : e.participantsCount;
  const quorum = nearest?.quorum;
  const scroll = useRef<HTMLDivElement>(null);
  const occurrenceNote = (o: OccurrenceResponse) => [
    OCCURRENCE_STATUS_LABEL[o.status], o.rescheduled ? "Перенесено" : undefined,
  ].filter(Boolean).join(" · ");
  const loadFailed = list.isError || (list.data && list.data.status !== 200);

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent showCloseButton={false} onCloseAutoFocus={(event) => { event.preventDefault(); onRestoreFocus(); }}
        className="flex h-dvh max-h-dvh max-w-none flex-col gap-4 rounded-none border-2 border-ink bg-card p-4 text-base shadow-hard sm:h-auto sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-[28px] sm:p-6">
        <DialogHeader className="shrink-0 gap-3">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="font-display text-xl leading-8 font-bold sm:text-2xl">Подробнее о встрече</DialogTitle>
            <DialogClose asChild><Button variant="soft" className="h-11 shrink-0 px-3">Закрыть</Button></DialogClose>
          </div>
          <DialogDescription className="text-base leading-6 break-words">{e.title}</DialogDescription>
        </DialogHeader>
        {open && <Tabs key={section} defaultValue={section} onValueChange={() => scroll.current?.scrollTo({ top: 0 })} className="min-h-0 flex-1 gap-4">
          <TabsList aria-label="Подробности встречи" className="w-full shrink-0">
            <TabsTrigger value="when" className="flex-1 px-2">Когда</TabsTrigger>
            <TabsTrigger value="where" className="flex-1 px-2">Где</TabsTrigger>
            <TabsTrigger value="registration" className="flex-1 px-2">Запись</TabsTrigger>
          </TabsList>
          <div ref={scroll} className="min-h-0 overflow-y-auto overscroll-contain pr-1 pb-[env(safe-area-inset-bottom)] text-lg leading-7 break-words whitespace-pre-wrap">
            <TabsContent value="when" className="space-y-4">
              <h2 className="font-display text-xl font-bold">Когда</h2>
              {e.recurring && !e.nextOccurrence ? <p>Ближайших запланированных занятий нет.</p> : <div className="space-y-2">
                <p>{e.recurring ? "Ближайшее занятие: " : "Начало: "}{dateTime(start)}</p>
                {end && <p>Окончание: {dateTime(end)}</p>}
                <p>{duration(start, end)}</p>
              </div>}
              {e.schedule && <>
                <p>{e.schedule.description}</p>
                <p className="text-base text-muted-foreground">Часовой пояс: {timeZone}. Все даты и время ниже указаны в этом часовом поясе.</p>
                <h3 className="font-bold">Ближайшие 8 занятий</h3>
                {list.isPending && <p role="status">Загружаем расписание…</p>}
                {loadFailed && <div role="alert" className="space-y-3"><p>{list.error?.detail ?? "Не удалось загрузить занятия. Попробуйте ещё раз."}</p><Button variant="soft" onClick={() => void list.refetch()}>Повторить</Button></div>}
                {upcoming?.length === 0 && <p>Будущих занятий нет.</p>}
                <ul className="space-y-3">
                  {upcoming?.slice(0, 8).map((o) => <li key={o.id} className="space-y-1 rounded-2xl border-2 border-ink bg-lavender-soft p-4">
                    <p className="font-bold">{dateTime(o.startAt)}</p>
                    {o.endAt && <p>До {dateTime(o.endAt)} · {duration(o.startAt, o.endAt).toLowerCase()}</p>}
                    <p className="font-bold">{occurrenceNote(o)}</p>
                    {o.rescheduled && o.originalStartAt && <p>Раньше: {dateTime(o.originalStartAt)}</p>}
                    {o.cancelReason && <p>Причина отмены: {o.cancelReason}</p>}
                  </li>)}
                </ul>
              </>}
              {!e.recurring && e.singleOccurrence && <><p className="font-bold">{occurrenceNote(e.singleOccurrence)}</p>{e.singleOccurrence.cancelReason && <p>Причина отмены: {e.singleOccurrence.cancelReason}</p>}</>}
              <Button asChild variant="soft" className="h-auto min-h-12 whitespace-normal py-3 text-base"><a href={getEventsCalendarUrl(e.id)}>Добавить в календарь</a></Button>
            </TabsContent>
            <TabsContent value="where" className="space-y-4">
              <h2 className="font-display text-xl font-bold">Где</h2>
              <p>{e.format === "ONLINE" ? "Онлайн" : e.address || "Адрес уточняется"}</p>
              {e.locationNote && <p>{e.locationNote}</p>}
              {e.format === "ONLINE" && (e.viewer.canSeePrivateDetails && e.onlineUrl
                ? <a href={e.onlineUrl} target="_blank" rel="noreferrer" className="block break-all text-primary underline">Подключиться к встрече: {e.onlineUrl}</a>
                : <p>{privateNote(e)}</p>)}
              {e.viewer.canSeePrivateDetails && e.privateDetails && <p>{e.privateDetails}</p>}
              {e.format === "OFFLINE" && e.lat != null && e.lon != null && <div className="flex flex-wrap gap-3">
                <Button asChild variant="soft" className="h-auto min-h-12 whitespace-normal py-3 text-base"><a href={`https://2gis.ru/geo/${e.lon},${e.lat}`} target="_blank" rel="noreferrer">Открыть в 2ГИС</a></Button>
                <Button asChild variant="soft" className="h-auto min-h-12 whitespace-normal py-3 text-base"><a href={`https://2gis.ru/directions/points/|${e.lon},${e.lat}`} target="_blank" rel="noreferrer">Построить маршрут</a></Button>
              </div>}
            </TabsContent>
            <TabsContent value="registration" className="space-y-4">
              <h2 className="font-display text-xl font-bold">Запись</h2>
              <p className="font-bold">{JOIN_MODE_LABEL[e.joinMode]}</p>
              <p>{e.joinMode === "FREE" ? "Вы становитесь участником сразу после записи." : "Отправьте заявку. Организатор рассмотрит её и решит, принять ли вас."}</p>
              {e.recurring && <p>Запись открывает доступ к серии. После вступления отметьте «Приду» на нужные занятия. Лимит мест и кворум считаются отдельно для каждого занятия.</p>}
              <div className="space-y-2 rounded-2xl border-2 border-ink bg-lime-soft p-4">
                {e.recurring && <p className="font-bold">Ближайшее занятие{e.nextOccurrence ? `: ${dateTime(e.nextOccurrence.startAt)}` : " не запланировано"}</p>}
                <p>{capacity != null ? `Лимит: ${capacity} мест${e.recurring ? " на занятие" : ""}.` : "Без лимита мест."}</p>
                {count != null && <p>{`Записались: ${count}.`}{capacity != null && ` Осталось мест: ${Math.max(0, capacity - count)}.`}</p>}
                {!e.recurring && capacity != null && capacity <= (count ?? -1) && e.joinMode === "FREE" && <p>Мест пока нет. При записи вы попадёте в лист ожидания.</p>}
                {e.recurring && e.nextOccurrence && !nearest && <p>{loadFailed ? "Не удалось загрузить места и кворум занятия." : "Загружаем места и кворум занятия…"}</p>}
                {e.minParticipants != null && <>
                  <p>Состоится от {e.minParticipants} участников.</p>
                  {quorum && nearest?.status !== "CANCELLED" && <p>{QUORUM_STATUS_LABEL[quorum.status]} · {quorum.count} из {quorum.required}.</p>}
                  {nearest?.status === "CANCELLED" && <p>{OCCURRENCE_STATUS_LABEL.CANCELLED}{nearest.cancelReason ? `: ${nearest.cancelReason}` : ""}</p>}
                </>}
              </div>
              <p>Уровень: {EVENT_LEVEL_LABEL[e.level]}.</p>
              {e.requirements && <div><h3 className="font-bold">Требования</h3><p>{e.requirements}</p></div>}
              {e.equipment && <div><h3 className="font-bold">Что взять</h3><p>{e.equipment}</p></div>}
              {e.viewer.registerBlockedReason && <p>{e.viewer.registerBlockedReason}</p>}
            </TabsContent>
          </div>
        </Tabs>}
      </DialogContent>
    </Dialog>
  );
}
