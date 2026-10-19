import { useUsersAchievements, useUsersUserAchievements } from "@/shared/api/generated/core/users/users";
import type { AchievementResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { usePublicProfile } from "./public-profile";

const TONES = ["bg-lime-soft", "bg-peach", "bg-lavender-soft", "bg-sky-soft", "bg-mint-soft", "bg-rose"];

export type Achievement = AchievementResponse & { tone: string; earned: boolean };

/** Достижения из API: свои или, внутри чужого профиля, этого человека. Полученные сверху (свежие первыми), дальше — те, что ближе к цели. */
export function useAchievements() {
  const owner = usePublicProfile();
  const ownerId = owner?.user.id;
  const options = { retry: false, staleTime: 60_000 };
  const mine = useUsersAchievements({ query: { ...options, enabled: !ownerId } });
  const theirs = useUsersUserAchievements(ownerId ?? "", { query: { ...options, enabled: Boolean(ownerId) } });
  const query = ownerId ? theirs : mine;
  const list: Achievement[] = (query.data?.status === 200 ? query.data.data : []).map((a, i) => ({
    ...a,
    tone: TONES[i % TONES.length],
    earned: Boolean(a.earnedAt),
  }));
  const earned = list
    .filter((a) => a.earned)
    .sort((a, b) => new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime());
  const locked = list.filter((a) => !a.earned).sort((a, b) => b.progress / b.goal - a.progress / a.goal);
  return { query, achievements: [...earned, ...locked], earnedCount: earned.length, total: list.length, mine: !ownerId };
}
