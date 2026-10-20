import type {
  OrganizationOverviewResponse,
  PublicOrganizationResponse,
} from "@/shared/api/generated/core/appAPI.schemas";
import { ShareDialog } from "@/features/share-link/ui/share-dialog";
import { ShareOrganization } from "@/features/share-link/ui/share-posters";
import { monthLabel } from "@/shared/lib/date-ru";

/** Афиша клуба использует только данные уже открытой публичной страницы. */
export function OrganizationShare({
  path,
  org,
  overview,
  onOpenChange,
}: {
  path: string;
  org: PublicOrganizationResponse;
  overview: OrganizationOverviewResponse;
  onOpenChange(open: boolean): void;
}) {
  const award = org.awards?.find((a) => a.earned && a.kind === "ORG_OF_MONTH");
  const next = overview.upcoming.items[0];
  const name = org.name || "Клуб";
  const stats = [
    { value: overview.hostedMeetings, label: "встреч проведено" },
    { value: overview.yearParticipants, label: "участников за год" },
    overview.returningShare != null
      ? { value: `${overview.returningShare}%`, label: "приходят снова" }
      : { value: overview.subscription.subscribersCount, label: "подписчиков" },
  ];
  return (
    <ShareDialog
      open
      onOpenChange={onOpenChange}
      path={path}
      title="Поделиться клубом"
      filename={name}
      description="Позови друзей в клуб: афиша для сторис и чатов. По QR и ссылке откроется страница клуба."
    >
      {(format) => (
        <ShareOrganization
          path={path}
          format={format}
          name={name}
          logoUrl={org.logoUrl}
          award={
            award
              ? `Организация месяца${award.period ? ` · ${monthLabel(award.period)}` : ""}`
              : undefined
          }
          location={[
            org.city,
            overview.firstEventYear &&
              `встречаемся с ${overview.firstEventYear} года`,
          ]
            .filter(Boolean)
            .join(" · ")}
          sports={(org.sports ?? []).slice(0, 4).map((sport) => sport.name)}
          stats={stats}
          nextMeeting={
            next &&
            `${next.title} · ${new Date(next.startAt).toLocaleDateString(
              "ru-RU",
              {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: next.timeZone,
              },
            )}`
          }
        />
      )}
    </ShareDialog>
  );
}
