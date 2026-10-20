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

/** Состояние вида спорта в справочнике (админка «Виды спорта»). */
export const SPORT_STATUS: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: "Активен", tone: "bg-lime-soft" },
  PENDING: { label: "На модерации", tone: "bg-peach" },
  HIDDEN: { label: "Скрыт", tone: "bg-salmon" },
  MERGED: { label: "Объединён", tone: "bg-salmon" },
};

/** Каналы связи организации: подпись и пример формата (формат проверяет сервер). */
export const CONTACT_TYPES: { key: string; label: string; placeholder: string }[] = [
  { key: "PHONE", label: "Телефон", placeholder: "+7 900 123-45-67" },
  { key: "TELEGRAM", label: "Telegram", placeholder: "@club или https://t.me/club" },
  { key: "EMAIL", label: "Почта", placeholder: "club@example.ru" },
  { key: "VK", label: "ВКонтакте", placeholder: "https://vk.com/club" },
  { key: "WHATSAPP", label: "WhatsApp", placeholder: "+7 900 123-45-67" },
  { key: "MAX", label: "MAX", placeholder: "https://max.ru/... или телефон" },
  { key: "WEBSITE", label: "Сайт", placeholder: "https://club.ru" },
];

/** Что означает статус заявки для самой организации: заголовок и пояснение в кабинете. */
export const ORGANIZATION_STATUS_HINT: Record<string, { title: string; text: string }> = {
  PENDING: {
    title: "Заявка на проверке",
    text: "Администратор рассматривает анкету. До допуска страница клуба скрыта, публиковать мероприятия нельзя.",
  },
  APPROVED: {
    title: "Клуб допущен",
    text: "Публичная страница открыта, мероприятия публикуются сразу, без повторной модерации.",
  },
  REJECTED: {
    title: "Заявка отклонена",
    text: "Исправьте анкету по причине ниже и сохраните — заявка уйдёт на повторную проверку.",
  },
  REVISION: {
    title: "Нужна доработка",
    text: "Администратор вернул анкету. Поправьте её по комментарию и сохраните — заявка снова уйдёт на проверку.",
  },
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
  ORGANIZATIONS: { label: "Организации", description: "Анонсы клубов, заявки организаций и решения по ним" },
  ORGANIZERS: { label: "Соорганизаторы", description: "Изменения команды организаторов" },
  ACHIEVEMENTS: { label: "Достижения", description: "Новые награды за вашу активность" },
} as const;

/** Новая встреча клуба, на анонсы которого подписан участник. */
export const ORGANIZATION_NOTIFICATION = {
  ORG_NEW_EVENT: { label: "Новая встреча клуба", icon: "icon-bell" as const, tone: "bg-lime-soft", action: "К встрече" },
};

/** Завершённое неотменённое занятие в архиве клуба. */
export const PAST_MEETING_STATUS = { label: "Проведено", tone: "bg-card" };
export const ORGANIZATION_VERIFIED_LABEL = "Проверена администратором";

/** Состояние занятия в полном расписании встречи. */
export const OCCURRENCE_STATUS_LABEL = {
  SCHEDULED: "Запланировано",
  CANCELLED: "Отменено",
} as const;

/** Короткая метка занятия в расписании «Подробнее о встрече»: слово + цвет, иконку рисует компонент. */
export const OCCURRENCE_BADGE = {
  CANCELLED: { label: "Отменено", tone: "bg-peach text-orange-ink" },
  RESCHEDULED: { label: "Перенесено", tone: "bg-sky-soft" },
  TAKES_PLACE: { label: "Состоится", tone: "bg-mint" },
  GATHERING: { label: "Набираем", tone: "bg-lavender-soft" },
  ATTENDING: { label: "Вы придёте", tone: "bg-lime" },
} as const;

/** Текущий результат сбора кворума на занятие. */
export const QUORUM_STATUS_LABEL = {
  GATHERING: "Собираем участников",
  REACHED: "Кворум набран — состоится",
  CONFIRMED: "Организатор подтвердил: состоится",
} as const;
