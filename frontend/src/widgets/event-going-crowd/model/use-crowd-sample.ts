import { useMemo, useState } from "react";
import type { EventParticipantResponse } from "@/shared/api/generated/core/appAPI.schemas";

/** Случайный ранг зависит только от seed страницы и id: порядок не меняется при refetch или перестановке ответа. */
function rank(id: string, seed: number) {
  let hash = seed;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x21f0aaad);
  hash = Math.imul(hash ^ (hash >>> 15), 0x735a2d97);
  return (hash ^ (hash >>> 15)) >>> 0;
}

/** Одна выборка для обеих раскладок страницы; текущий участник первым, остальные в случайном порядке. */
export function useCrowdSample(participants: EventParticipantResponse[], viewerId?: string) {
  const [seed] = useState(() => Math.floor(Math.random() * 0x100000000));
  return useMemo(() => [...participants].sort((a, b) => {
    if (a.id === b.id) return 0;
    if (a.id === viewerId) return -1;
    if (b.id === viewerId) return 1;
    return rank(a.id, seed) - rank(b.id, seed) || a.id.localeCompare(b.id);
  }).slice(0, 6), [participants, viewerId, seed]);
}
