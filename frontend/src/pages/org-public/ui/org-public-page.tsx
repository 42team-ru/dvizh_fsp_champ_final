import { Link, useParams } from "react-router";
import { useOrganizationsGet } from "@/shared/api/generated/core/organizations/organizations";
import { useEventsList } from "@/shared/api/generated/core/events/events";
import { toCardData } from "@/entity/event/lib/event-format";
import { EventCard } from "@/widgets/event-card/ui/event-card";
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
            <Card className="flex-col gap-5 rounded-[28px] p-6 sm:flex-row sm:items-start lg:p-8">
              {org.logoUrl ? (
                <img src={org.logoUrl} alt="" className="size-24 shrink-0 rounded-[20px] border-2 border-ink object-cover" />
              ) : (
                <span className="flex size-24 shrink-0 items-center justify-center rounded-[20px] border-2 border-ink bg-secondary font-display text-4xl font-extrabold">
                  {org.name?.[0]}
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-lime-soft text-foreground">✓ Проверено администратором</Badge>
                  {org.city && <Badge variant="outline">{org.city}</Badge>}
                </div>
                <h1 className="font-display text-[30px] leading-9 font-extrabold break-words lg:text-[40px] lg:leading-[48px]">{org.name}</h1>
                <p className="text-base leading-[25px] font-medium whitespace-pre-wrap break-words">{org.description}</p>
                {(org.sports?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {org.sports!.map((s) => <Badge key={s.id} className="bg-mint-soft text-foreground">{s.name}</Badge>)}
                  </div>
                )}
                {awards.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {awards.map((a, i) => <Badge key={i} title={a.description} className="bg-secondary text-foreground">🏆 {a.title}</Badge>)}
                  </div>
                )}
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-[220px] sm:grid-cols-1">
                <div className="rounded-[14px] border-2 border-ink bg-lime-soft px-4 py-3">
                  <p className="font-display text-2xl font-extrabold">{org.hostedMeetings ?? 0}</p>
                  <p className="text-xs font-bold text-muted-foreground">{plural(org.hostedMeetings ?? 0, ["встреча проведена", "встречи проведено", "встреч проведено"])}</p>
                </div>
                <div className="rounded-[14px] border-2 border-ink bg-sky-soft px-4 py-3">
                  <p className="font-display text-2xl font-extrabold">{org.participantsTotal ?? 0}</p>
                  <p className="text-xs font-bold text-muted-foreground">{plural(org.participantsTotal ?? 0, ["участник", "участника", "участников"])}</p>
                </div>
              </div>
            </Card>

            {contacts.length > 0 && (
              <Card className="gap-3 p-6">
                <h2 className="font-display text-xl font-bold">Связаться</h2>
                <div className="flex flex-wrap gap-2">
                  {contacts.map((c) => (
                    <Button key={c.key} asChild variant="soft" size="sm">
                      <a href={contactHref(c.key, org.contacts![c.key])} target="_blank" rel="noreferrer">
                        {c.label}: {org.contacts![c.key]}
                      </a>
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            <section className="flex flex-col gap-4">
              <h2 className="font-display text-[26px] leading-8 font-bold">Ближайшие мероприятия</h2>
              {events.isLoading ? (
                <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
              ) : items.length === 0 ? (
                <Card className="p-6 text-base font-semibold text-muted-foreground">Пока нет запланированных встреч.</Card>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((e) => (
                    <EventCard key={e.id} href={`/events/${e.id}`} titleLines={2}
                      event={toCardData(e, { photo: e.coverUrl ?? e.sport.imageUrl })} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <MobileTabBar current="feed" />
    </div>
  );
}
