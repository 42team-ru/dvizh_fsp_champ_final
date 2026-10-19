import { useUser } from "@/entity/user/model/use-user";
import { useEventsMine } from "@/shared/api/generated/core/events/events";
import { useUsersHistory, useUsersHistorySummary, useUsersMySports } from "@/shared/api/generated/core/users/users";
import type { UserSportResponse } from "@/shared/api/generated/core/appAPI.schemas";

const MONTHS = ["ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ", "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ"];

/** Склонение по числу: plural(5, ["занятие", "занятия", "занятий"]). */
export function plural(n: number, forms: readonly [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/** Транслит для машиночитаемой строки паспорта: P<RUS<SOKOLOVA<<ANNA<<0048. */
const LATIN: Record<string, string> = {
  а: "A", б: "B", в: "V", г: "G", д: "D", е: "E", ё: "E", ж: "ZH", з: "Z", и: "I", й: "I", к: "K", л: "L", м: "M",
  н: "N", о: "O", п: "P", р: "R", с: "S", т: "T", у: "U", ф: "F", х: "KH", ц: "TS", ч: "CH", ш: "SH", щ: "SHCH",
  ъ: "", ы: "Y", ь: "", э: "E", ю: "IU", я: "IA",
};
const latin = (text: string) =>
  [...text.toLowerCase()].map((c) => LATIN[c] ?? (/[a-z0-9]/.test(c) ? c.toUpperCase() : "<")).join("");

export type Achievement = { title: string; icon: string; tone: string; unlocked: boolean };

/**
 * Всё для экрана профиля из API: кто я, мои виды спорта, посещения (всего и по дням текущего месяца),
 * сколько мероприятий я организую. Достижения считаются из этих же данных.
 */
export function useProfile() {
  const { user } = useUser();
  const sportsQuery = useUsersMySports();
  const summaryQuery = useUsersHistorySummary({});
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const historyQuery = useUsersHistory({ from: monthStart.toISOString(), size: 100 });
  const organizedQuery = useEventsMine({ size: 1 });

  const sports: UserSportResponse[] = sportsQuery.data?.status === 200 ? sportsQuery.data.data : [];
  const summary = summaryQuery.data?.status === 200 ? summaryQuery.data.data : undefined;
  const history = historyQuery.data?.status === 200 ? historyQuery.data.data.items ?? [] : [];
  const organized = organizedQuery.data?.status === 200 ? organizedQuery.data.data.totalElements ?? 0 : 0;
  const attended = summary?.total ?? 0;

  // Посещения по дням текущего месяца, до сегодняшнего дня включительно.
  const days = Array.from({ length: now.getDate() }, () => 0);
  for (const visit of history) {
    const date = new Date(visit.startAt);
    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) days[date.getDate() - 1]++;
  }

  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  const number = (user?.id ?? "").replace(/-/g, "").slice(0, 4).toUpperCase();

  const achievements: Achievement[] = [
    { title: "Первая тренировка", icon: "icon-trophy", tone: "bg-secondary", unlocked: attended >= 1 },
    { title: "10 посещений", icon: "icon-flame", tone: "bg-peach", unlocked: attended >= 10 },
    { title: "Три вида спорта", icon: "icon-sun", tone: "bg-lavender-soft", unlocked: sports.length >= 3 },
    { title: "Организатор", icon: "icon-star", tone: "bg-sky-soft", unlocked: organized >= 1 },
    { title: "50 посещений", icon: "icon-trophy", tone: "bg-lime-soft", unlocked: attended >= 50 },
  ];

  return {
    user,
    isLoading: !user,
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" ") || user?.username || "",
    initials: ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() || (user?.username?.[0] ?? "").toUpperCase(),
    handle: [user?.username && `@${user.username}`, user?.city].filter(Boolean).join(" · "),
    passportNumber: `№ SR-${number || "0000"}`,
    mrz: `P<RUS<${latin(lastName)}<<${latin(firstName)}<<${number}`.slice(0, 44),
    sports,
    stats: [
      { value: String(attended), label: plural(attended, ["посещение", "посещения", "посещений"]) },
      { value: String(sports.length), label: plural(sports.length, ["вид спорта", "вида спорта", "видов спорта"]) },
      { value: String(organized), label: plural(organized, ["событие веду", "события веду", "событий веду"]) },
    ],
    month: MONTHS[now.getMonth()],
    days,
    monthTotal: days.reduce((sum, n) => sum + n, 0),
    achievements,
  };
}
