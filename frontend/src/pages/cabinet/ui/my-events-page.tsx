import { coverOf } from "@/entity/event/lib/cover";
import { CalendarPlus, PartyPopper } from "lucide-react";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useEventsMine } from "@/shared/api/generated/core/events/events";
import type { EventSummaryResponse, EventsMineStatus } from "@/shared/api/generated/core/appAPI.schemas";
import { EVENT_KIND_LABEL, EVENT_STATUS, JOIN_MODE_LABEL } from "@/shared/lib/statuses";
import { Button } from "@/shared/components/ui/button";
import { useOrganizationsMe } from "@/shared/api/generated/core/organizations/organizations";
import { useCabinetAccess } from "@/entity/user/model/use-cabinet-access";
import { EventsMap } from "@/widgets/events-map/ui/events-map";
import { CabinetLayout } from "./cabinet-layout";
import { Chip, PillTabs } from "./parts";
import { dayTime } from "../model/format";

const PAGE = 20;

/** Сколько мероприятий в статусе — для счётчика на вкладке. */
function useCount(status: EventsMineStatus) {
  const q = useEventsMine({ status, size: 1 });
  return q.data?.status === 200 ? q.data.data.totalElements ?? 0 : 0;
}

/** Строка «места · записались · режим» под названием. */
function stats(e: EventSummaryResponse) {
  const parts = [
    e.capacity != null ? `${e.recurring ? "лимит" : "мест"} ${e.capacity}${e.recurring ? " на занятие" : ""}` : "без лимита",
    `${e.recurring ? "в серии" : "записались"} ${e.participantsCount}`,
    e.minParticipants != null ? `кворум ${e.minParticipants}` : undefined,
    JOIN_MODE_LABEL[e.joinMode].toLowerCase(),
  ];
  return parts.filter(Boolean).join(" · ");
}

function EventRow({ event: e }: { event: EventSummaryResponse }) {
  const status = EVENT_STATUS[e.status];
  const moderated = e.status !== "PUBLISHED";
  return (
    <article className="flex flex-col gap-3 rounded-[24px] border-2 border-ink bg-card p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <img
        src={coverOf(e).src}
        style={{ objectPosition: coverOf(e).position }}
        alt=""
        className="size-[72px] shrink-0 rounded-[16px] border-2 border-ink bg-sky object-cover sm:size-[88px]"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Link to={`/my/events/${e.id}/manage`} className="font-display text-xl leading-[26px] font-extrabold text-foreground hover:underline">
          {e.title}
        </Link>
        <p className="text-sm font-bold text-foreground">
          {e.recurring && e.scheduleDescription ? e.scheduleDescription : dayTime(e.startAt)}
          {e.format === "ONLINE" ? " · онлайн" : e.address ? ` · ${e.address}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip tone="bg-mint-soft" className="normal-case">{e.sport.name}</Chip>
          {e.kind && <Chip className="normal-case">{EVENT_KIND_LABEL[e.kind]}</Chip>}
          <Chip tone={status.tone}>{status.label}</Chip>
          {e.cancelledByOrganizer && <Chip tone="bg-salmon">Отменено</Chip>}
        </div>
        {moderated ? (
          <p className="text-sm leading-[19px] font-bold text-orange-ink">
            Причина администратора: «{e.moderationReason ?? "не указана"}». В ленте мероприятия нет, запись закрыта.
          </p>
        ) : (
          <p className="text-sm font-medium text-muted-foreground">{stats(e)}</p>
        )}
      </div>
      {e.status !== "DELETED" && (
        <Button asChild variant="outline" size="sm" className="self-start sm:self-center">
          <Link to={`/my/events/${e.id}/manage`}>Управлять</Link>
        </Button>
      )}
    </article>
  );
}

/** Кабинет: мероприятия, которые я веду (автор или соорганизатор), по статусу публикации. */
export default function MyEventsPage() {
  const [status, setStatus] = useState<EventsMineStatus>("PUBLISHED");
  const [size, setSize] = useState(PAGE);
  const query = useEventsMine({ status, size });
  const page = query.data?.status === 200 ? query.data.data : undefined;
  const items = page?.items ?? [];
  const total = page?.totalElements ?? 0;
  const { isOrg } = useCabinetAccess();
  const org = useOrganizationsMe({ query: { enabled: isOrg, retry: false } });
  const orgId = org.data?.status === 200 ? org.data.data.id : undefined;
  const counts = { PUBLISHED: useCount("PUBLISHED"), UNPUBLISHED: useCount("UNPUBLISHED"), DELETED: useCount("DELETED") };

  return (
    <CabinetLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[28px] leading-[34px] font-extrabold text-foreground">Мои мероприятия</h1>
        <Button asChild variant="secondary">
          <Link to="/events/new">
            <Plus className="size-[18px]" strokeWidth={2.6} />
            Создать
          </Link>
        </Button>
      </div>

      <PillTabs
        value={status}
        onChange={(s) => {
          setStatus(s);
          setSize(PAGE);
        }}
        tabs={[
          { key: "PUBLISHED", label: "Опубликованные", count: counts.PUBLISHED },
          { key: "UNPUBLISHED", label: "Снятые", count: counts.UNPUBLISHED },
          { key: "DELETED", label: "Удалённые", count: counts.DELETED },
        ]}
        className="self-start"
      />

      {query.isLoading ? (
        <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
      ) : items.length === 0 ? (
        status === "PUBLISHED" ? (
          <EmptyState icon={CalendarPlus} bublik="point" tone="bg-secondary" title="Пока нет мероприятий"
            text="Создайте первое — укажите вид спорта, время и место, и участники найдут его в ленте."
            action={
              <Button asChild>
                <Link to="/events/new">Создать событие</Link>
              </Button>
            } />
        ) : (
          <EmptyState icon={PartyPopper} tone="bg-mint" title="Здесь пусто — и это хорошо" />
        )
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </div>
      )}

      {items.length < total && (
        <Button variant="outline" size="sm" className="self-center" onClick={() => setSize((s) => Math.min(100, s + PAGE))} disabled={query.isFetching}>
          Показать ещё {total - items.length}
        </Button>
      )}

      {orgId && status === "PUBLISHED" && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-extrabold text-foreground">На карте</h2>
          <p className="text-sm font-medium text-muted-foreground">Очные мероприятия организации на ближайшие 30 дней.</p>
          <EventsMap filters={{ organizationId: orgId }} className="w-full" mapClassName="h-[380px]" />
        </section>
      )}

      {status !== "PUBLISHED" && (
        <p className="rounded-[14px] bg-lavender-soft px-3.5 py-3 text-sm leading-[19px] font-medium text-muted-foreground">
          Решение администратора видите только вы — в публичной ленте этих мероприятий нет.
        </p>
      )}
    </CabinetLayout>
  );
}
