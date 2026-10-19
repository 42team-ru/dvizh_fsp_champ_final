import { useUser } from "@/entity/user/model/use-user";
import { useEventsMine } from "@/shared/api/generated/core/events/events";
import { useUsersHistory, useUsersHistorySummary, useUsersMySports } from "@/shared/api/generated/core/users/users";
import type { UserSportResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { usePublicProfile } from "./public-profile";

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

/**
 * Всё для экрана профиля из API: кто я, мои виды спорта, посещения (всего и по дням текущего месяца),
 * сколько мероприятий я организую. В чужом профиле (`PublicProfileProvider`) — то же из публичного
 * профиля: «мои» запросы выключены, `readOnly` прячет правку.
 */
export function useProfile() {
  const owner = usePublicProfile();
  const mine = { query: { enabled: !owner } };
  const { user: me } = useUser();
  const sportsQuery = useUsersMySports(mine);
  const summaryQuery = useUsersHistorySummary({}, mine);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const historyQuery = useUsersHistory({ from: monthStart.toISOString(), size: 100 }, mine);
  const organizedQuery = useEventsMine({ size: 1 }, mine);

  const user = owner ? owner.user : me;
  const sports: UserSportResponse[] = owner
    ? owner.user.sports
    : sportsQuery.data?.status === 200 ? sportsQuery.data.data : [];
  const summary = summaryQuery.data?.status === 200 ? summaryQuery.data.data : undefined;
  const history = !owner && historyQuery.data?.status === 200 ? historyQuery.data.data.items ?? [] : [];
  // у чужого профиля известны только ближайшие события, которые он ведёт
  const organized = owner
    ? owner.user.events.length
    : organizedQuery.data?.status === 200 ? organizedQuery.data.data.totalElements ?? 0 : 0;
  const attended = owner ? owner.user.attendedCount : summary?.total ?? 0;

  // Посещения по дням текущего месяца, до сегодняшнего дня включительно.
  const days = Array.from({ length: now.getDate() }, () => 0);
  for (const visit of history) {
    const date = new Date(visit.startAt);
    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) days[date.getDate() - 1]++;
  }

  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  const number = (user?.id ?? "").replace(/-/g, "").slice(0, 4).toUpperCase();

  return {
    user,
    readOnly: Boolean(owner),
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
      {
        value: String(organized),
        label: owner
          ? plural(organized, ["событие ведёт", "события ведёт", "событий ведёт"])
          : plural(organized, ["событие веду", "события веду", "событий веду"]),
      },
    ],
    month: MONTHS[now.getMonth()],
    days,
    monthTotal: days.reduce((sum, n) => sum + n, 0),
  };
}
