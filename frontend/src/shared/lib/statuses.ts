/**
 * Подписи значений модели для UI в одном месте: уровни, режимы записи, форматы, статусы записи.
 */

/** Уровень в профиле (вид спорта пользователя). */
export const SPORT_LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "Новичок",
  AMATEUR: "Любитель",
  PRO: "Профи",
};

/** Уровень мероприятия. */
export const EVENT_LEVEL_LABEL: Record<string, string> = {
  ANY: "Любой",
  BEGINNER: "Новичок",
  AMATEUR: "Любитель",
  PRO: "Профи",
};

export const EVENT_KIND_LABEL: Record<string, string> = {
  TRAINING: "Тренировка",
  GAME: "Игра",
  MEETUP: "Встреча",
  AMATEUR_TOURNAMENT: "Любительский турнир",
};

export const JOIN_MODE_LABEL: Record<string, string> = {
  FREE: "Свободная запись",
  REQUEST: "По заявке",
};

export const FORMAT_LABEL: Record<string, string> = {
  OFFLINE: "Очно",
  ONLINE: "Онлайн",
};

/** Статус моей записи: текст и цвет плашки. Цвет не единственный носитель смысла — текст всегда рядом. */
export const REGISTRATION_STATUS: Record<string, { label: string; tone: string }> = {
  CONFIRMED: { label: "Вы записаны", tone: "bg-mint text-foreground" },
  PENDING: { label: "Ожидает решения", tone: "bg-secondary text-foreground" },
  REJECTED: { label: "Заявка отклонена", tone: "bg-destructive text-destructive-foreground" },
  CANCELLED: { label: "Запись отменена", tone: "bg-muted text-muted-foreground" },
};
