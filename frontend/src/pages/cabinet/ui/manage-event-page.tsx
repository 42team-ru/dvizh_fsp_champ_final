import { coverOf } from "@/entity/event/lib/cover";
import { Link, useSearchParams } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { useRegistrationsListForEvent } from "@/shared/api/generated/core/registrations/registrations";
import { useOccurrencesList } from "@/shared/api/generated/core/occurrences/occurrences";
import { useCommentsList } from "@/shared/api/generated/core/comments/comments";
import { EVENT_KIND_LABEL, EVENT_STATUS, JOIN_MODE_LABEL } from "@/shared/lib/statuses";
import { Button } from "@/shared/components/ui/button";
import { useManageEvent, type ManagedEvent } from "../model/use-manage-event";
import { dateShort, dayTime } from "../model/format";
import { CabinetLayout } from "./cabinet-layout";
import { Chip, Crumbs, PillTabs } from "./parts";
import { RequestsTab } from "./requests-tab";
import { OccurrencesTab } from "./occurrences-tab";
import { PhotosTab, TeamTab } from "./team-tab";
import { DiscussionTab } from "./discussion-tab";

type Tab = "requests" | "occurrences" | "team" | "photos" | "discussion";
const TABS: Tab[] = ["requests", "occurrences", "team", "photos", "discussion"];

/** Строка с цифрами под названием: места, решения, кворум, режим записи. */
function summary(e: ManagedEvent, pending: number) {
  const join = JOIN_MODE_LABEL[e.joinMode].toLowerCase();
  if (e.recurring) {
    return [
      e.schedule ? `серия до ${dateShort(e.schedule.endDate)}` : "серия",
      e.capacity != null ? `лимит ${e.capacity} на занятие` : "без лимита",
      e.minParticipants != null ? `кворум ${e.minParticipants}` : undefined,
      `в серии ${e.participantsCount}`,
      join,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  const free = e.capacity != null ? Math.max(0, e.capacity - e.participantsCount) : undefined;
  return [
    e.capacity != null ? `мест ${e.capacity}` : "без лимита",
    `принято ${e.participantsCount}`,
    e.joinMode === "REQUEST" ? `ждут ответа ${pending}` : undefined,
    free != null ? `свободно ${free}` : undefined,
    e.minParticipants != null ? `кворум ${e.minParticipants}` : undefined,
    join,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Header({ event: e, pending, tabs }: { event: ManagedEvent; pending: number; tabs: React.ReactNode }) {
  const status = EVENT_STATUS[e.status];
  const cover = coverOf(e);
  const where = e.format === "ONLINE" ? "онлайн" : e.address;
  return (
    <section className="flex flex-col gap-4 rounded-[24px] border-2 border-ink bg-card px-4 pt-5 pb-4 sm:px-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <img src={cover.src} style={{ objectPosition: cover.position }} alt="" className="size-[72px] shrink-0 rounded-[16px] border-2 border-ink bg-mint object-cover sm:size-[88px]" />
          <div className="flex min-w-0 flex-col items-start gap-2">
            <h1 className="font-display text-[22px] leading-[28px] font-extrabold text-foreground sm:text-2xl sm:leading-[30px]">{e.title}</h1>
            <p className="text-sm font-bold text-foreground">
              {e.schedule?.description ?? dayTime(e.startAt)}
              {where ? ` · ${where}` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip tone="bg-mint-soft" className="normal-case">{e.sport.name}</Chip>
              {e.kind && <Chip className="normal-case">{EVENT_KIND_LABEL[e.kind]}</Chip>}
              <Chip tone={status.tone}>{status.label}</Chip>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{summary(e, pending)}</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="self-start sm:self-center">
          <Link to={`/events/${e.id}`}>
            <ArrowUpRight className="size-4" strokeWidth={2.6} />
            Открыть в ленте
          </Link>
        </Button>
      </div>
      {tabs}
    </section>
  );
}

/** Снято или удалено администратором: вердикт с причиной видит только организатор. */
function Moderation({ event: e }: { event: ManagedEvent }) {
  if (e.status === "PUBLISHED") return null;
  const status = EVENT_STATUS[e.status];
  return (
    <div className="flex flex-col gap-2.5 rounded-[18px] border-2 border-ink bg-card px-[18px] py-4">
      <Chip tone={status.tone} className="self-start">{status.label}</Chip>
      <p className="text-sm leading-[19px] font-medium text-muted-foreground">
        Причина администратора: «{e.moderationReason ?? "не указана"}».{" "}
        {e.status === "DELETED"
          ? "Мероприятие осталось только в списке «Удалённые»; управлять им нельзя."
          : "Мероприятие скрыто из ленты, записи не принимаются."}
      </p>
    </div>
  );
}

/** Кабинет: одно мероприятие — заявки, занятия, команда, фото и обсуждение. */
export default function ManageEventPage() {
  const { id, query, event, refresh } = useManageEvent();
  const [params, setParams] = useSearchParams();
  const allowed = Boolean(event?.viewer.canManage);
  const regs = useRegistrationsListForEvent(id, undefined, { query: { enabled: allowed } });
  const occs = useOccurrencesList(id, undefined, { query: { enabled: allowed } });
  const comments = useCommentsList(id, undefined, { query: { enabled: allowed } });

  const raw = params.get("tab") as Tab | null;
  const tab: Tab = raw && TABS.includes(raw) ? raw : "requests";
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true });

  if (query.isLoading) {
    return (
      <CabinetLayout>
        <Crumbs />
        <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
      </CabinetLayout>
    );
  }

  if (!event || !allowed) {
    return (
      <CabinetLayout>
        <Crumbs title={event?.title} />
        {event && <Moderation event={event} />}
        <div className="rounded-[24px] border-2 border-ink bg-card p-6">
          <p className="text-base font-bold text-foreground">
            {!event
              ? "Мероприятие не найдено."
              : event.status === "DELETED"
                ? "Удалённым мероприятием управлять нельзя."
                : "Управлять этим мероприятием могут только его организаторы."}
          </p>
        </div>
      </CabinetLayout>
    );
  }

  const pending = regs.data?.status === 200 ? regs.data.data.filter((r) => r.status === "PENDING").length : 0;
  const tabs = (
    <PillTabs
      value={tab}
      onChange={setTab}
      className="self-start"
      tabs={[
        { key: "requests", label: event.joinMode === "REQUEST" ? "Заявки" : "Участники", count: event.joinMode === "REQUEST" ? pending : event.participantsCount },
        { key: "occurrences", label: "Занятия", count: occs.data?.status === 200 ? occs.data.data.length : undefined },
        { key: "team", label: "Команда", count: event.organizers.length },
        { key: "photos", label: "Фото", count: event.photos.length },
        { key: "discussion", label: "Обсуждение", count: comments.data?.status === 200 ? comments.data.data.length : undefined },
      ]}
    />
  );

  return (
    <CabinetLayout>
      <Crumbs title={event.title} />
      <Header event={event} pending={pending} tabs={tabs} />
      <Moderation event={event} />
      {tab === "requests" && <RequestsTab event={event} refresh={refresh} />}
      {tab === "occurrences" && <OccurrencesTab event={event} refresh={refresh} />}
      {tab === "team" && <TeamTab event={event} refresh={refresh} />}
      {tab === "photos" && <PhotosTab event={event} refresh={refresh} />}
      {tab === "discussion" && <DiscussionTab event={event} />}
    </CabinetLayout>
  );
}
