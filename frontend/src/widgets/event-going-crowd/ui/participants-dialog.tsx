import { useState } from "react";
import { Link } from "react-router";
import { X } from "lucide-react";
import type { EventParticipantResponse, OrganizerResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { StaticBeaver } from "@/widgets/beaver-pet/ui/static-beaver";
import type { BeaverActivity, BeaverArts, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";

type Props = {
  participants: EventParticipantResponse[];
  viewerId?: string;
  authorId: string;
  organizers: OrganizerResponse[];
  arts: BeaverArts;
};

export function ParticipantsDialog({ participants, viewerId, authorId, organizers, arts }: Props) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
  const visible = participants.filter((p) => `${p.firstName} ${p.lastName} ${p.username}`.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").includes(term));
  const organizerIds = new Set([authorId, ...organizers.filter((o) => !o.invited).map((o) => o.user.id)]);

  return (
    <DialogContent showCloseButton={false} className="top-0 left-0 flex h-dvh max-w-full translate-x-0 translate-y-0 flex-col gap-4 rounded-none border-2 border-ink bg-card p-4 text-foreground shadow-hard sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[85dvh] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[24px] sm:p-6">
      <DialogHeader className="shrink-0 pr-14">
        <DialogTitle className="font-display text-xl font-bold sm:text-2xl">Кто идёт · {participants.length}</DialogTitle>
        <DialogDescription className="text-base">Все подтверждённые участники встречи</DialogDescription>
      </DialogHeader>
      <DialogClose asChild>
        <Button type="button" variant="outline" size="icon" rough={false} className="absolute top-4 right-4" aria-label="Закрыть список участников"><X /></Button>
      </DialogClose>
      {participants.length > 8 && (
        <Input type="search" aria-label="Поиск участников по имени или логину" placeholder="Поиск по имени или логину" value={search} onChange={(event) => setSearch(event.target.value)} className="shrink-0 text-base" />
      )}
      <div className="min-h-0 overflow-y-auto overscroll-contain p-1">
        {visible.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {visible.map((p) => {
              const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || p.username;
              return (
                <li key={p.id}>
                  <Link to={`/users/${p.id}`} className="group flex items-center gap-3 rounded-[18px] border-2 border-ink bg-background p-3 shadow-hard-sm outline-none hover:bg-sky-soft focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2" aria-label={`${name}, @${p.username} — профиль`}>
                    <span aria-hidden="true" className="relative block size-12 shrink-0 overflow-hidden rounded-full border-2 border-ink bg-lime-soft">
                      <StaticBeaver outfit={p.pet.outfit as BeaverOutfit} activity={p.pet.activity as BeaverActivity} arts={arts} className="absolute -top-1 -left-3 h-[85px] w-24" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-extrabold wrap-anywhere">{name}</span>
                      <span className="block text-sm text-muted-foreground wrap-anywhere">@{p.username}</span>
                      <span className="flex flex-wrap gap-1">
                        {p.id === viewerId && <span className="mt-1 rounded-full border-2 border-ink bg-lime-soft px-2 py-0.5 text-xs font-bold">Это вы</span>}
                        {organizerIds.has(p.id) && <span className="mt-1 rounded-full border-2 border-ink bg-lavender-soft px-2 py-0.5 text-xs font-bold">Организатор</span>}
                      </span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 rounded-full border-2 border-ink bg-card px-2 py-2 text-sm font-extrabold shadow-hard-sm group-hover:bg-lime-soft sm:px-3">Профиль</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : <p role="status" className="py-8 text-center text-base font-semibold text-muted-foreground">{participants.length === 0 ? "Пока никто не записался" : "Участники не найдены"}</p>}
      </div>
    </DialogContent>
  );
}
