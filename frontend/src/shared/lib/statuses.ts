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

/** Статус заявки глазами организатора (кабинет, вкладка «Заявки»). */
export const PARTICIPANT_STATUS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "Ждёт", tone: "bg-peach" },
  CONFIRMED: { label: "Принят", tone: "bg-secondary" },
  REJECTED: { label: "Отклонена", tone: "bg-salmon" },
  CANCELLED: { label: "Отменил сам", tone: "bg-track" },
  WAITLISTED: { label: "В очереди", tone: "bg-sky-soft" },
};

/** Статус публикации мероприятия. */
export const EVENT_STATUS: Record<string, { label: string; tone: string }> = {
  PUBLISHED: { label: "Опубликовано", tone: "bg-lime-soft" },
  UNPUBLISHED: { label: "Снято с публикации", tone: "bg-peach" },
  DELETED: { label: "Удалено", tone: "bg-salmon" },
};

/** Статус допуска организации. */
export const ORGANIZATION_STATUS: Record<string, { label: string; tone: string }> = {
  APPROVED: { label: "допущена", tone: "bg-lime-soft" },
  PENDING: { label: "на проверке", tone: "bg-sky-soft" },
  REJECTED: { label: "отклонена", tone: "bg-salmon" },
  REVISION: { label: "на доработке", tone: "bg-peach" },
};

/** Категории внешних уведомлений: единые подписи и пояснения для настроек. */
export const NOTIFICATION_CATEGORY_LABEL = {
  REMINDERS: { label: "Напоминания", description: "За сутки и за час до начала" },
  EVENTS: { label: "Изменения встреч", description: "Перенос, отмена и кворум" },
  REGISTRATIONS: { label: "Записи и заявки", description: "Новые участники и решения по заявкам" },
  DISCUSSIONS: { label: "Ответы в обсуждении", description: "Когда отвечают на ваше сообщение" },
  ORGANIZATIONS: { label: "Проверка организации", description: "Заявки организаций и решения по ним" },
  ORGANIZERS: { label: "Соорганизаторы", description: "Изменения команды организаторов" },
  ACHIEVEMENTS: { label: "Достижения", description: "Новые награды за вашу активность" },
} as const;
