import { CalendarClock, FileText, Trophy } from "lucide-react";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Link, useParams } from "react-router";
import type { EventSummaryResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { useOrganizationsGet } from "@/shared/api/generated/core/organizations/organizations";
import { useEventsList } from "@/shared/api/generated/core/events/events";
import { formatWhen } from "@/entity/event/lib/event-format";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Icon } from "@/shared/components/ui/icon";
import { CONTACT_TYPES } from "@/shared/lib/statuses";
import { plural } from "@/shared/lib/plural";

/** Ссылка для контакта: телефон, почта, Telegram и сайты открываются сразу. */
function contactHref(type: string, value: string) {
  if (type === "PHONE") return `tel:${value.replace(/[^\d+]/g, "")}`;
  if (type === "WHATSAPP") return `https://wa.me/${value.replace(/\D/g, "")}`;
  if (type === "EMAIL") return `mailto:${value}`;
  if (type === "TELEGRAM" && value.startsWith("@")) return `https://t.me/${value.slice(1)}`;
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

/** Строка ближайшей встречи: дата плиткой, название, вид спорта, время и место, заполненность. */
function UpcomingRow({ event: e }: { event: EventSummaryResponse }) {
  const d = new Date(e.startAt);
  const going = e.occurrenceAttendeesCount ?? e.participantsCount;
  const left = e.capacity != null ? e.capacity - going : undefined;
  return (
    <Card className="flex-row items-center gap-4 p-4">
      <div className="flex size-[60px] shrink-0 flex-col items-center justify-center rounded-[14px] border-2 border-ink bg-sky-soft">
        <span className="text-[10px] leading-3 font-extrabold uppercase">{d.toLocaleDateString("ru-RU", { weekday: "short" })}</span>
        <span className="font-display text-2xl leading-7 font-extrabold">{d.getDate()}</span>
        <span className="text-[10px] leading-3 font-extrabold uppercase">{d.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "")}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-base leading-5 font-extrabold break-words">{e.title}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{e.sport.name}</Badge>
          <span className="text-sm font-medium text-muted-foreground">
            {formatWhen(e.startAt)}{e.format === "ONLINE" ? " · онлайн" : e.address ? ` · ${e.address}` : ""}
          </span>
        </div>
        <p className="text-xs font-semibold text-muted-foreground">
          {e.capacity != null ? `Идут ${going} из ${e.capacity}${left! > 0 ? ` · осталось ${left}` : " · мест нет"}` : `Идут ${going}`}
        </p>
      </div>
      <Button asChild variant="ink" size="sm" className="shrink-0">
        <Link to={`/events/${e.id}`}>Открыть</Link>
      </Button>
    </Card>
  );
}

/** Публичная страница допущенной организации: о клубе, виды спорта, контакты и ближайшие мероприятия. */
export default function OrgPublicPage() {
  const { id = "" } = useParams();
  const query = useOrganizationsGet(id, { query: { retry: false } });
  const org = query.data?.status === 200 ? query.data.data : undefined;
  const events = useEventsList({ organizationId: id, size: 30 }, { query: { enabled: Boolean(org) } });
  const items = events.data?.status === 200 ? events.data.data : [];
  const contacts = CONTACT_TYPES.filter((c) => org?.contacts?.[c.key]);
  const awards = (org?.awards ?? []).filter((a) => a.earned);

  return (
    <div className="relative isolate min-h-dvh overflow-clip bg-background pb-[110px] lg:pb-12">
      <MemphisBackground seed="feed" />
      <div className="hidden lg:block"><AppHeader current="feed" /></div>
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 pt-6 lg:px-8 lg:pt-8">
        <Button asChild variant="soft" className="h-10 self-start px-[18px] text-sm">
          <Link to="/feed"><Icon name="event/icon-back" className="size-[18px]" />К ленте</Link>
        </Button>

        {query.isLoading && <p className="text-lg font-semibold text-muted-foreground">Загружаем…</p>}
        {query.isError && (
          <Card className="gap-2 p-6">
            <p className="font-display text-xl font-bold">Страница недоступна</p>
            <p className="text-base font-medium text-muted-foreground">
              Организации нет или она ещё не прошла проверку администратора.
            </p>
          </Card>
        )}

        {org && (
          <>
            <section className="flex flex-col gap-5 rounded-[28px] border-2 border-ink bg-lime p-5 shadow-hard sm:p-[30px]">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {org.logoUrl ? (
                  <img src={org.logoUrl} alt="" className="size-[116px] shrink-0 rounded-[24px] border-2 border-ink bg-card object-cover" />
                ) : (
                  <span className="flex size-[116px] shrink-0 items-center justify-center rounded-[24px] border-2 border-ink bg-card font-display text-[56px] leading-none font-extrabold">
                    {org.name?.[0]}
                  </span>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {awards.some((a) => a.kind === "ORG_OF_MONTH") && (
                      <Badge className="bg-ink text-lime">🏆 Организация месяца</Badge>
                    )}
                    <Badge variant="outline">✓ Проверена администратором</Badge>
                  </div>
                  <h1 className="font-display text-[30px] leading-9 font-extrabold break-words lg:text-[40px] lg:leading-[50px]">{org.name}</h1>
                  {org.city && <p className="text-[15px] leading-[19px] font-semibold">{org.city}</p>}
                  {(org.sports?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {org.sports!.map((s) => <Badge key={s.id} variant="outline" className="h-[27px]">{s.name}</Badge>)}
                    </div>
                  )}
                </div>
              </div>
              {org.description && (
                <p className="text-base leading-[25px] font-medium whitespace-pre-wrap break-words">{org.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[16px] border-2 border-ink bg-card px-[18px] py-3.5">
                  <p className="font-display text-[26px] leading-8 font-extrabold">{org.hostedMeetings ?? 0}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{plural(org.hostedMeetings ?? 0, ["встреча проведена", "встречи проведено", "встреч проведено"])}</p>
                </div>
                <div className="rounded-[16px] border-2 border-ink bg-card px-[18px] py-3.5">
                  <p className="font-display text-[26px] leading-8 font-extrabold">{org.participantsTotal ?? 0}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{plural(org.participantsTotal ?? 0, ["участник", "участника", "участников"])}</p>
                </div>
              </div>
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <section className="flex flex-col gap-4">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-display text-[26px] leading-8 font-bold">Ближайшие встречи</h2>
                  {items.length > 0 && <span className="text-sm font-semibold text-muted-foreground">{items.length} запланировано</span>}
                </div>
                {events.isLoading ? (
                  <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
                ) : items.length === 0 ? (
                  <EmptyState icon={CalendarClock} tone="bg-secondary" title="Пока нет запланированных встреч" text="Загляните позже — клуб скоро опубликует новые." />
                ) : (
                  items.map((e) => <UpcomingRow key={e.id} event={e} />)
                )}
              </section>

              <aside className="flex flex-col gap-5">
                <Card className="gap-3 p-[22px]">
                  <h2 className="font-display text-xl font-bold">Награды</h2>
                  {awards.length === 0 ? (
                    <p className="text-sm font-medium text-muted-foreground">Наград пока нет — они появятся после проведённых встреч.</p>
                  ) : (
                    awards.map((a, i) => (
                      <div key={i} title={a.description} className="flex items-center gap-3 rounded-[14px] border-2 border-ink bg-lime-soft px-3.5 py-3">
                        <Trophy className="size-5 shrink-0" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-sm leading-[18px] font-extrabold">{a.title}</p>
                          {a.description && <p className="text-xs leading-4 font-medium text-muted-foreground">{a.description}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </Card>

                {contacts.length > 0 && (
                  <Card className="gap-3 p-[22px]">
                    <h2 className="font-display text-xl font-bold">Контакты</h2>
                    {contacts.map((c) => (
                      <a
                        key={c.key}
                        href={contactHref(c.key, org.contacts![c.key])}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col rounded-[14px] border-2 border-ink bg-sky-soft px-3.5 py-2.5 break-words hover:bg-sky"
                      >
                        <span className="text-[10px] leading-3 font-extrabold tracking-[1px] text-muted-foreground uppercase">{c.label}</span>
                        <span className="text-sm leading-5 font-bold">{org.contacts![c.key]}</span>
                      </a>
                    ))}
                  </Card>
                )}

                {(org.documents?.length ?? 0) > 0 && (
                  <Card className="gap-3 p-[22px]">
                    <h2 className="font-display text-xl font-bold">Документы</h2>
                    <p className="text-xs font-medium text-muted-foreground">Проверены администратором</p>
                    {org.documents!.map((d) => (
                      <a key={d.id} href={d.url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2.5 rounded-[14px] border-2 border-ink bg-card px-3.5 py-2.5 hover:bg-sky-soft">
                        <FileText className="size-4 shrink-0" aria-hidden />
                        <span className="min-w-0 truncate text-sm font-bold">{d.name}</span>
                      </a>
                    ))}
                  </Card>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
      <MobileTabBar current="feed" />
    </div>
  );
}
