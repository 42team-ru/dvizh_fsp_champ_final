import { useUsersHistorySummary } from "@/shared/api/generated/core/users/users";

const FORMS = ["посещение", "посещения", "посещений"] as const;

/** Склонение по числу: 1 посещение, 2 посещения, 5 посещений. */
export function visitsWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return FORMS[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return FORMS[1];
  return FORMS[2];
}

/** Сводка посещений из истории (users_historySummary): всего и любимый вид спорта. */
export function useAttendance() {
  const query = useUsersHistorySummary({});
  const data = query.data?.status === 200 ? query.data.data : undefined;
  const total = data?.total ?? 0;
  const top = data?.bySport[0];
  const text = !data
    ? "Загружаем историю посещений…"
    : total === 0
      ? "Пока нет посещённых занятий. Запишись на событие — и здесь появится твоя статистика."
      : top
        ? `Чаще всего — ${top.sport.name}: ${top.count}. Всего видов спорта: ${data.bySport.length}.`
        : "";
  return { total, text, word: visitsWord(total) };
}
