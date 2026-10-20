import { profilePath } from "@/entity/user/lib/profile-path";
import { useState } from "react";
import { Link } from "react-router";
import { FileText, MapPin } from "lucide-react";
import { cn } from "cn";
import type {
  AwardBadgeResponse,
  PublicOrganizationResponse,
  OrganizationOverviewResponse,
} from "@/shared/api/generated/core/appAPI.schemas";
import { AchievementPicture } from "@/shared/components/ui/achievement-picture";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { CONTACT_TYPES } from "@/shared/lib/statuses";
import { monthLabel } from "@/shared/lib/date-ru";
import { plural } from "@/shared/lib/plural";

const DAY_NAMES = [
  ["MONDAY", "ПН"],
  ["TUESDAY", "ВТ"],
  ["WEDNESDAY", "СР"],
  ["THURSDAY", "ЧТ"],
  ["FRIDAY", "ПТ"],
  ["SATURDAY", "СБ"],
  ["SUNDAY", "ВС"],
];
const titleStyle = "font-display text-xl leading-7 font-extrabold";
function contactHref(type: string, value: string) {
  if (type === "PHONE") return `tel:${value.replace(/[^\d+]/g, "")}`;
  if (type === "WHATSAPP") return `https://wa.me/${value.replace(/\D/g, "")}`;
  if (type === "EMAIL") return `mailto:${value}`;
  if (type === "TELEGRAM" && value.startsWith("@"))
    return `https://t.me/${value.slice(1)}`;
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

function OrganizationAwards({ awards }: { awards: AwardBadgeResponse[] }) {
  const [opened, setOpened] = useState<AwardBadgeResponse | null>(null);
  const latest = awards.find((a) => a.earned && a.kind === "ORG_OF_MONTH");
  const sorted = [...awards].sort(
    (a, b) =>
      Number(b === latest) - Number(a === latest) ||
      Number(b.earned) - Number(a.earned),
  );
  return (
    <Card className="gap-3 p-5">
      <h2 className={titleStyle}>Награды</h2>
      {sorted.map((a, i) => (
        <button
          key={`${a.kind}-${a.period ?? i}`}
          type="button"
          onClick={() => setOpened(a)}
          aria-haspopup="dialog"
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-[14px] border-2 p-3 text-left outline-none hover:shadow-hard-sm focus-visible:ring-2 focus-visible:ring-primary",
            a.earned
              ? cn(
                  "border-ink",
                  a.kind !== "ORG_OF_MONTH" || a === latest
                    ? "bg-lime"
                    : "bg-lime-soft",
                )
              : "border-dashed border-muted-foreground bg-background",
          )}
        >
          <AchievementPicture
            imageUrl={a.imageUrl}
            earned={a.earned}
            size="lg"
          />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-sm leading-[18px] font-extrabold">
              {a.title}
            </span>
            <span className="text-xs leading-4 font-semibold text-muted-foreground">
              {a.period
                ? monthLabel(a.period)
                : a.earned
                  ? a.description
                  : a.goal
                    ? `почти ${a.progress} из ${a.goal}`
                    : a.description}
            </span>
            {!a.earned && a.goal > 0 && (
              <span className="h-1.5 overflow-hidden rounded-full border border-ink bg-card">
                <span
                  className="block h-full bg-primary"
                  style={{
                    width: `${Math.min(100, (a.progress / a.goal) * 100)}%`,
                  }}
                />
              </span>
            )}
          </span>
        </button>
      ))}
      <Dialog
        open={Boolean(opened)}
        onOpenChange={(open) => !open && setOpened(null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[24px] border-2 border-ink bg-card p-6 shadow-hard">
          {opened && (
            <>
              <DialogTitle className={titleStyle}>{opened.title}</DialogTitle>
              <DialogDescription>{opened.description}</DialogDescription>
              <div className="flex flex-wrap items-center gap-5">
                <AchievementPicture
                  imageUrl={opened.imageUrl}
                  earned={opened.earned}
                  size="xl"
                />
                <div className="flex-1 text-sm font-bold">
                  <p>
                    {opened.earned ? "✓ Награда получена" : "Ещё не получена"}
                  </p>
                  {opened.period && (
                    <p className="mt-2 capitalize">
                      {monthLabel(opened.period)}
                    </p>
                  )}
                  {opened.earnedAt && (
                    <p className="mt-2 text-muted-foreground">
                      {new Date(opened.earnedAt).toLocaleDateString("ru-RU")}
                    </p>
                  )}
                  {opened.goal > 0 && (
                    <>
                      <p className="mt-3">
                        {opened.progress} из {opened.goal}
                      </p>
                      <span
                        role="progressbar"
                        aria-label="Прогресс награды"
                        aria-valuenow={opened.progress}
                        aria-valuemin={0}
                        aria-valuemax={opened.goal}
                        className="mt-2 block h-3 overflow-hidden rounded-full border-2 border-ink bg-lavender"
                      >
                        <span
                          className="block h-full bg-primary"
                          style={{
                            width: `${(opened.progress / opened.goal) * 100}%`,
                          }}
                        />
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Button variant="soft" onClick={() => setOpened(null)}>
                Понятно
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function OrganizationSidebar({
  org,
  overview: o,
}: {
  org: PublicOrganizationResponse;
  overview: OrganizationOverviewResponse;
}) {
  const contacts = CONTACT_TYPES.filter((c) => org.contacts?.[c.key]);
  return (
    <aside className="flex min-w-0 flex-col gap-5">
      <OrganizationAwards awards={org.awards ?? []} />
      {o.schedule.length > 0 && (
        <Card className="gap-3 p-5">
          <h2 className={titleStyle}>Регулярные встречи</h2>
          {DAY_NAMES.map(([day, short], i) => {
            const meeting = o.schedule.find((m) => m.day === day);
            return (
              <div key={day} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink text-xs font-extrabold",
                    meeting
                      ? [
                          "bg-lavender-soft",
                          "bg-sky-soft",
                          "bg-mint-soft",
                          "bg-peach",
                          "bg-rose",
                          "bg-sky-soft",
                          "bg-lime-soft",
                        ][i]
                      : "bg-background",
                  )}
                >
                  {short}
                </span>
                {meeting ? (
                  <Link
                    to={`/events/${meeting.eventId}`}
                    className="min-w-0 hover:underline"
                  >
                    <p className="text-sm font-extrabold">
                      {new Date(meeting.startAt).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: meeting.timeZone,
                      })}
                    </p>
                    <p className="text-xs font-semibold break-words text-muted-foreground">
                      {meeting.title} · {meeting.place}
                    </p>
                  </Link>
                ) : (
                  <div className="text-xs font-semibold text-muted-foreground">
                    <p>—</p>
                    <p>отдыхаем</p>
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-[10px] font-semibold text-muted-foreground">
            Ближайшие занятия в следующие 4 недели. Время местное для встречи.
          </p>
        </Card>
      )}
      {o.leaders.length > 0 && (
        <Card className="gap-3 p-5">
          <h2 className={titleStyle}>Кто ведёт встречи</h2>
          {o.leaders.map((l) => (
            <Link
              key={l.user.id}
              to={profilePath(l.user)}
              className="flex items-center gap-3 hover:underline"
            >
              <UserAvatar
                user={l.user}
                className="size-10 shrink-0 rounded-full border-2 border-ink object-cover"
              />
              <div className="min-w-0">
                <p className="text-sm font-extrabold break-words">
                  {[l.user.firstName, l.user.lastName]
                    .filter(Boolean)
                    .join(" ") || l.user.username}
                </p>
                <p className="text-xs font-semibold text-muted-foreground">
                  {l.meetingsCount}{" "}
                  {plural(l.meetingsCount, ["встреча", "встречи", "встреч"])}
                </p>
              </div>
            </Link>
          ))}
        </Card>
      )}
      {o.places.length > 0 && (
        <Card className="gap-4 p-5">
          <h2 className={titleStyle}>Где встречаемся</h2>
          {o.places.map((p) => (
            <div key={p.name} className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 flex-1 text-sm font-bold break-words">
                {p.name}
              </span>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                {p.meetingsCount} встреч
              </span>
            </div>
          ))}
          <Button asChild variant="soft" size="sm" className="self-start">
            <Link to={`/feed?organizationId=${org.id}&view=map`}>
              Показать на карте
            </Link>
          </Button>
        </Card>
      )}
      {contacts.length > 0 && (
        <Card className="gap-3 p-5">
          <h2 className={titleStyle}>Контакты</h2>
          {contacts.map((c) => (
            <a
              key={c.key}
              href={contactHref(c.key, org.contacts![c.key])}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col rounded-[14px] border-2 border-ink bg-background px-4 py-3 break-words hover:bg-lavender-soft"
            >
              <span className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
                {c.label}
              </span>
              <span className="text-sm font-extrabold">
                {org.contacts![c.key]}
              </span>
            </a>
          ))}
        </Card>
      )}
      {(org.documents?.length ?? 0) > 0 && (
        <Card className="gap-3 p-5">
          <h2 className={titleStyle}>Документы</h2>
          <p className="text-xs font-semibold text-muted-foreground">
            Проверены администратором
          </p>
          {org.documents!.map((d) => (
            <a
              key={d.id}
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-[14px] border-2 border-ink p-3 hover:bg-lavender-soft"
            >
              <FileText className="size-5 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block break-words text-sm font-bold">
                  {d.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.ceil(d.size / 1024)} КБ
                </span>
              </span>
            </a>
          ))}
        </Card>
      )}
    </aside>
  );
}
