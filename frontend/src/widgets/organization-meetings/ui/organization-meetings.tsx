import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CalendarDays, Camera, MapPin } from "lucide-react";
import { cn } from "cn";
import type {
  OrganizationMeetingResponse,
  OrganizationOverviewResponse,
} from "@/shared/api/generated/core/appAPI.schemas";
import { useOrganizationsPastMeetings } from "@/shared/api/generated/core/organizations/organizations";
import { AvatarStack } from "@/shared/components/ui/avatar-stack";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { monthLabel } from "@/shared/lib/date-ru";
import {
  PAST_MEETING_STATUS,
  REGISTRATION_STATUS,
} from "@/shared/lib/statuses";

function dateParts(m: OrganizationMeetingResponse) {
  const d = new Date(m.startAt);
  const options = { timeZone: m.timeZone };
  return {
    weekday: d.toLocaleDateString("ru-RU", { ...options, weekday: "short" }),
    day: d.toLocaleDateString("ru-RU", { ...options, day: "numeric" }),
    month: d
      .toLocaleDateString("ru-RU", { ...options, month: "short" })
      .replace(".", ""),
    time: d.toLocaleTimeString("ru-RU", {
      ...options,
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function UpcomingRow({ meeting: m }: { meeting: OrganizationMeetingResponse }) {
  const date = dateParts(m);
  const remaining =
    m.capacity == null ? null : Math.max(0, m.capacity - m.attendeesCount);
  const registered = m.myRegistrationStatus === "CONFIRMED";
  return (
    <Card className="flex-row flex-wrap items-center gap-4 rounded-[16px] p-3.5 shadow-hard-sm sm:flex-nowrap">
      <div className="flex h-[74px] w-[64px] shrink-0 flex-col items-center justify-center rounded-xl border-2 border-ink bg-lavender-soft">
        <span className="text-[10px] font-extrabold text-primary uppercase">
          {date.weekday}
        </span>
        <span className="font-display text-[26px] leading-8 font-extrabold">
          {date.day}
        </span>
        <span className="text-[10px] font-extrabold text-primary uppercase">
          {date.month}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Link
          to={`/events/${m.eventId}`}
          className="text-[15px] leading-5 font-extrabold break-words hover:underline"
        >
          {m.title}
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Badge variant="outline" className="bg-sky-soft">
            {m.sport.name}
          </Badge>
          {date.time} · {m.place}
        </div>
        <div className="flex items-center gap-2">
          <AvatarStack people={m.attendees} />
          <span className="text-xs font-bold">
            Идут {m.attendeesCount}
            {m.capacity != null && ` из ${m.capacity}`}
          </span>
        </div>
      </div>
      <div className="ml-auto flex w-full flex-col items-end gap-2 sm:w-[124px]">
        {remaining != null && (
          <>
            <span className="text-[11px] font-extrabold text-muted-foreground">
              {remaining > 0 ? `осталось ${remaining}` : "мест нет"}
            </span>
            <span
              role="progressbar"
              aria-label="Заполненность встречи"
              aria-valuenow={m.attendeesCount}
              aria-valuemin={0}
              aria-valuemax={m.capacity!}
              className="h-2 w-[120px] overflow-hidden rounded-full border border-ink bg-lavender"
            >
              <span
                className="block h-full bg-primary"
                style={{
                  width: `${Math.min(100, (m.attendeesCount / Math.max(1, m.capacity!)) * 100)}%`,
                }}
              />
            </span>
          </>
        )}
        {registered ? (
          <Badge variant="secondary">
            {REGISTRATION_STATUS.CONFIRMED.label}
          </Badge>
        ) : (
          <Button asChild variant="secondary" size="sm">
            <Link to={`/events/${m.eventId}`}>Записаться</Link>
          </Button>
        )}
      </div>
    </Card>
  );
}

export function UpcomingMeetings({
  id,
  overview: o,
}: {
  id: string;
  overview: OrganizationOverviewResponse;
}) {
  return (
    <section id="upcoming" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-display text-[23px] font-extrabold">
          Ближайшие встречи
        </h2>
        <span className="text-xs font-semibold text-muted-foreground">
          {o.upcoming.totalElements} запланировано
        </span>
        <Link
          className="ml-auto text-xs font-extrabold hover:underline"
          to={`/feed?organizationId=${id}`}
        >
          Все {o.upcoming.totalElements} →
        </Link>
      </div>
      {o.upcoming.items.length ? (
        o.upcoming.items.map((m) => <UpcomingRow key={m.id} meeting={m} />)
      ) : (
        <EmptyState
          icon={CalendarDays}
          tone="bg-lime-soft"
          title="Пока нет запланированных встреч"
          text="Подпишитесь на анонсы новых встреч клуба."
        />
      )}
    </section>
  );
}

function MonthlyChart({
  months,
}: {
  months: OrganizationOverviewResponse["months"];
}) {
  const max = Math.max(1, ...months.map((m) => m.count));
  return (
    <Card className="gap-5 rounded-[20px] p-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="text-sm font-extrabold">Встречи по месяцам</h3>
        <span className="text-xs font-semibold text-muted-foreground">
          {months[0] && monthLabel(months[0].month)} —{" "}
          {months.at(-1) && monthLabel(months.at(-1)!.month)}
        </span>
      </div>
      <div
        className="flex h-[132px] items-end gap-2 sm:gap-4"
        role="img"
        aria-label={months
          .map((m) => `${monthLabel(m.month)}: ${m.count}`)
          .join(", ")}
      >
        {months.map((m) => (
          <div
            key={m.month}
            className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5 text-center"
          >
            <span className="text-[10px] font-extrabold text-muted-foreground">
              {m.count}
            </span>
            <span
              className={cn(
                "block min-h-0 rounded-t-lg border-2 border-ink",
                m.current
                  ? "bg-lime"
                  : m.awardMonth
                    ? "bg-orange"
                    : "bg-ultramarine",
              )}
              style={{
                height: `${m.count ? Math.max(8, (m.count / max) * 100) : 2}px`,
              }}
            />
            <span className="text-[10px] font-bold text-muted-foreground">
              {new Date(m.month)
                .toLocaleDateString("ru-RU", { month: "short" })
                .replace(".", "")}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold text-muted-foreground">
        {[
          ["bg-ultramarine", "встречи"],
          ["bg-orange", "организация месяца"],
          ["bg-lime", "текущий месяц"],
        ].map(([tone, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <i className={cn("size-3 rounded-sm border border-ink", tone)} />
            {label}
          </span>
        ))}
      </div>
    </Card>
  );
}

function PastCard({ meeting: m }: { meeting: OrganizationMeetingResponse }) {
  const src = m.coverUrl || m.sport.imageUrl;
  const focus = m.coverUrl ? m.coverFocus : m.sport.imageFocus;
  return (
    <Card className="gap-0 overflow-hidden rounded-[18px] p-0 shadow-hard-sm">
      <div className="relative h-[170px] overflow-hidden border-b-2 border-ink bg-lavender-soft">
        {src ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            className="size-full object-cover"
            style={{ objectPosition: `${focus?.x ?? 50}% ${focus?.y ?? 50}%` }}
          />
        ) : (
          <CalendarDays className="m-auto h-full w-16 text-primary" />
        )}
        <Badge
          variant="outline"
          className="absolute top-3 left-3 bg-card text-[10px]"
        >
          ✓ {PAST_MEETING_STATUS.label.toUpperCase()} ·{" "}
          {new Date(m.startAt).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "short",
            timeZone: m.timeZone,
          })}
        </Badge>
        {m.photosCount > 0 && (
          <Badge
            variant="outline"
            className="absolute right-3 bottom-3 gap-1 bg-card"
          >
            <Camera className="size-3" />
            {m.photosCount} фото
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <Link
          to={`/events/${m.eventId}`}
          className="text-base font-extrabold hover:underline"
        >
          {m.title}
        </Link>
        <p className="flex items-start gap-1 text-xs font-semibold text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          {m.place}
        </p>
        <div className="flex items-center gap-2">
          <AvatarStack people={m.attendees} />
          <span className="text-xs font-bold">пришли {m.attendeesCount}</span>
        </div>
        <Button asChild variant="soft" size="sm" className="mt-auto w-full">
          <Link to={`/events/${m.eventId}#event-photos`}>Фото</Link>
        </Button>
      </div>
    </Card>
  );
}

export function PastMeetings({
  id,
  overview: o,
}: {
  id: string;
  overview: OrganizationOverviewResponse;
}) {
  const [sportId, setSportId] = useState<string>();
  const [page, setPage] = useState(0);
  const [loaded, setLoaded] = useState<
    Record<number, OrganizationMeetingResponse[]>
  >({});
  const remote = useOrganizationsPastMeetings(
    id,
    { sportId, page, size: 4 },
    { query: { enabled: Boolean(sportId) || page > 0 } },
  );
  const batch = remote.data?.data;
  useEffect(() => {
    if (batch) setLoaded((previous) => ({ ...previous, [page]: batch.items }));
  }, [batch, page]);
  const total = sportId
    ? (o.pastSports.find((s) => s.sport.id === sportId)?.count ?? 0)
    : o.hostedMeetings;
  const items = [
    ...(!sportId ? o.past.items : []),
    ...Object.entries(loaded)
      .filter(([index]) => sportId || Number(index) > 0)
      .sort(([a], [b]) => Number(a) - Number(b))
      .flatMap(([, meetings]) => meetings),
  ];
  const uniqueItems = Array.from(new Map(items.map((m) => [m.id, m])).values());
  function chooseSport(value?: string) {
    setSportId(value);
    setPage(0);
    setLoaded({});
  }
  const groups = new Map<string, OrganizationMeetingResponse[]>();
  uniqueItems.forEach((m) => {
    const month = new Date(m.startAt)
      .toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
        timeZone: m.timeZone,
      })
      .replace(" г.", "");
    groups.set(month, [...(groups.get(month) || []), m]);
  });
  return (
    <section id="past" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-display text-[23px] font-extrabold">
          Проведённые встречи
        </h2>
        <span className="text-xs font-semibold text-muted-foreground">
          {o.hostedMeetings} за всё время
        </span>
      </div>
      <MonthlyChart months={o.months} />
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <Button
          size="chip"
          variant={!sportId ? "default" : "soft"}
          aria-pressed={!sportId}
          onClick={() => {
            chooseSport();
          }}
        >
          Все {o.hostedMeetings}
        </Button>
        {o.pastSports.map((s) => (
          <Button
            key={s.sport.id}
            size="chip"
            variant={sportId === s.sport.id ? "default" : "soft"}
            aria-pressed={sportId === s.sport.id}
            onClick={() => {
              chooseSport(s.sport.id);
            }}
          >
            {s.sport.name} {s.count}
          </Button>
        ))}
      </div>
      {remote.isFetching && (
        <p role="status" className="text-sm font-bold text-muted-foreground">
          Загружаем встречи…
        </p>
      )}
      {remote.isError && (
        <p role="alert" className="text-sm text-destructive">
          Не удалось загрузить встречи.{" "}
          <button className="underline" onClick={() => void remote.refetch()}>
            Повторить
          </button>
        </p>
      )}
      {Array.from(groups, ([month, meetings]) => (
        <div key={month} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-extrabold capitalize">{month}</h3>
            <span className="h-0.5 flex-1 bg-lavender" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {meetings.map((m) => (
              <PastCard key={m.id} meeting={m} />
            ))}
          </div>
        </div>
      ))}
      {total > uniqueItems.length && (
        <Button
          className="self-center"
          variant="soft"
          disabled={remote.isFetching}
          onClick={() => {
            if (remote.isError) void remote.refetch();
            else setPage((p) => p + 1);
          }}
        >
          Показать ещё {total - uniqueItems.length} встреч
        </Button>
      )}
      {total === 0 && (
        <p className="py-4 text-sm font-semibold text-muted-foreground">
          История встреч появится после первого занятия.
        </p>
      )}
    </section>
  );
}
