import { ArrowUpRight, MapPin } from "lucide-react";
import type {
  PublicOrganizationResponse,
  OrganizationOverviewResponse,
} from "@/shared/api/generated/core/appAPI.schemas";
import { SubscribeButton } from "@/features/organization-subscription/ui/subscribe-button";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { AvatarStack } from "@/shared/components/ui/avatar-stack";
import { monthLabel } from "@/shared/lib/date-ru";
import { ORGANIZATION_VERIFIED_LABEL } from "@/shared/lib/statuses";
import { plural } from "@/shared/lib/plural";

export function OrganizationHeader({
  org,
  overview,
  onShare,
}: {
  org: PublicOrganizationResponse;
  overview?: OrganizationOverviewResponse;
  onShare?(): void;
}) {
  const latest = org.awards?.find((a) => a.earned && a.kind === "ORG_OF_MONTH");
  const stats = [
    [overview?.hostedMeetings ?? org.hostedMeetings, "встреч проведено"],
    [overview?.yearParticipants ?? "—", "участников за год"],
    [overview?.photosCount ?? "—", "фото с встреч"],
    ...(overview?.returningShare != null
      ? [[`${overview.returningShare}%`, "приходят снова"]]
      : []),
  ];
  return (
    <section
      id="overview"
      className="flex flex-col gap-6 rounded-[28px] border-2 border-ink bg-lime px-5 pt-7 pb-6 shadow-hard sm:px-7"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex size-[116px] shrink-0 items-center justify-center overflow-hidden rounded-[24px] border-[3px] border-ink bg-card shadow-hard">
            {org.logoUrl ? (
              <img
                src={org.logoUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <span className="font-display text-[64px] font-extrabold">
                {org.name?.[0]}
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {latest && (
                <Badge className="h-auto max-w-full bg-ink whitespace-normal text-lime">
                  Организация месяца
                  {latest.period && ` · ${monthLabel(latest.period)}`}
                </Badge>
              )}
              <Badge
                variant="outline"
                className="h-auto max-w-full bg-card whitespace-normal"
              >
                ✓ {ORGANIZATION_VERIFIED_LABEL}
              </Badge>
            </div>
            <h1 className="font-display text-[28px] leading-tight font-extrabold break-words xl:text-[38px]">
              {org.name}
            </h1>
            {(org.city || overview?.firstEventYear) && (
              <p className="flex flex-wrap items-center gap-1 text-sm font-bold">
                <MapPin className="size-4" />
                {org.city}
                {overview?.firstEventYear &&
                  `${org.city ? " · " : ""}встречаемся с ${overview.firstEventYear} года`}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {org.sports?.map((s) => (
                <Badge key={s.id} variant="outline" className="bg-sky-soft">
                  {s.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        {overview && (
          <div className="flex shrink-0 flex-col items-start gap-3 lg:max-w-[270px] lg:items-end">
            <SubscribeButton
              id={org.id!}
              subscribed={overview.subscription.subscribed}
            />
            {onShare && (
              <Button
                variant="soft"
                className="h-11 px-4 text-sm"
                aria-haspopup="dialog"
                onClick={onShare}
              >
                <ArrowUpRight className="size-[18px]" />
                Поделиться
              </Button>
            )}
            <div className="flex items-center gap-2 text-xs font-extrabold">
              <AvatarStack people={overview.subscription.subscriberAvatars} />
              {overview.subscription.subscribersCount}{" "}
              {plural(overview.subscription.subscribersCount, [
                "подписчик",
                "подписчика",
                "подписчиков",
              ])}
            </div>
            <p className="text-xs font-semibold text-ink/70">
              {overview.petName || "Бублик"} напомнит о каждой новой встрече
            </p>
          </div>
        )}
      </div>
      {/* три счётчика на планшете — в один ряд, без одинокой карточки во втором */}
      <div className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${stats.length === 3 ? "sm:grid-cols-3" : ""}`}>
        {stats.map(([value, label]) => (
          <div
            key={label}
            className="rounded-[16px] border-2 border-ink bg-card px-4 py-3"
          >
            <p className="font-display text-[28px] leading-9 font-extrabold">
              {value ?? 0}
            </p>
            <p className="text-xs font-semibold text-muted-foreground">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
