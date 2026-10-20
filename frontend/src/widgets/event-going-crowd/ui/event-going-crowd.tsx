import { useMemo, type CSSProperties } from "react";
import { Link } from "react-router";
import type { EventParticipantResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { usePetsCatalog } from "@/shared/api/generated/core/pets/pets";
import { Card } from "@/shared/components/ui/card";
import { StaticBeaver } from "@/widgets/beaver-pet/ui/static-beaver";
import type { BeaverActivity, BeaverArts, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";
import "./event-going-crowd.css";

type Props = {
  participants: EventParticipantResponse[];
  going: number;
  capacity?: number;
  className?: string;
};

function Names({ participants, rest, className }: { participants: EventParticipantResponse[]; rest: number; className: string }) {
  const names = participants.map((p) => p.firstName || p.username).join(", ");
  const line = `${names}${rest > 0 ? ` и ещё ${rest}` : ""}`;
  return <p title={line} className={`truncate text-[13px] font-semibold text-muted-foreground ${className}`}>{line}</p>;
}

/** Бобры участников на одной поляне: выборка приходит от страницы и общая для мобильной и десктопной версии. */
export function EventGoingCrowd({ participants, going, capacity, className }: Props) {
  const catalog = usePetsCatalog({ query: { staleTime: 5 * 60_000, enabled: participants.length > 0 } });
  const arts = useMemo(() => {
    const result: BeaverArts = {};
    for (const slot of catalog.data?.data.slots ?? []) {
      for (const item of slot.items) if (item.art) result[`${slot.id}:${item.id}`] = item.art;
    }
    return result;
  }, [catalog.data]);
  const rest = Math.max(0, going - participants.length);
  const mobileRest = Math.max(0, going - Math.min(participants.length, 4));

  return (
    <Card className={`event-going-crowd shrink-0 gap-[14px] p-[18px] lg:gap-[18px] lg:p-6 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-[17px] font-bold text-foreground lg:text-xl">Кто идёт</h2>
        <span className="text-[13px] font-bold text-muted-foreground">{going}{capacity != null ? ` из ${capacity}` : ""}</span>
      </div>
      <div className="event-going-crowd__scene relative h-[170px] rounded-[18px] border-2 border-ink bg-sky-soft">
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[46px] rounded-b-[16px] bg-lime" />
        {participants.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-semibold text-muted-foreground">Пока никого — будьте первым</p>
        ) : (
          <>
            <div className="event-going-crowd__row" style={{ "--crowd-size": participants.length, "--crowd-mobile-size": Math.min(participants.length, 4) } as CSSProperties}>
              {participants.map((participant) => {
                const name = [participant.firstName, participant.lastName].filter(Boolean).join(" ") || participant.username;
                return (
                  <Link key={participant.id} to={`/users/${participant.id}`} aria-label={name} className="event-going-crowd__beaver">
                    <StaticBeaver outfit={participant.pet.outfit as BeaverOutfit} activity={participant.pet.activity as BeaverActivity} arts={arts} className="event-going-crowd__art" />
                    <span aria-hidden="true" className="event-going-crowd__tooltip">{name}</span>
                  </Link>
                );
              })}
            </div>
            {rest > 0 && <span className="event-going-crowd__more event-going-crowd__wide" aria-label={`Ещё ${rest} участников`}>+{rest}</span>}
            {mobileRest > 0 && <span className="event-going-crowd__more event-going-crowd__narrow" aria-label={`Ещё ${mobileRest} участников`}>+{mobileRest}</span>}
          </>
        )}
      </div>
      {participants.length > 0 && <>
        <Names participants={participants} rest={rest} className="event-going-crowd__wide" />
        <Names participants={participants.slice(0, 4)} rest={mobileRest} className="event-going-crowd__narrow" />
      </>}
    </Card>
  );
}
