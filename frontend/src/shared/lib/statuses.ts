import {
  Ban, Bell, CalendarCheck, CalendarClock, CalendarPlus, CalendarX, CircleAlert, CircleCheck, CircleX, Clock, EyeOff,
  FileClock, FilePen, MessageCircleQuestion, MessageCircleReply, PencilLine, RotateCcw, ShieldCheck, ShieldX, Trash2,
  Trophy, UserRoundCog, UserRoundMinus, UserRoundPlus, UserRoundX, UsersRound, type LucideIcon,
} from "lucide-react";
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
  ORG_NEW_EVENT: { label: "Новая встреча клуба", action: "К встрече" },
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

/** Вид поста в блоге: подпись и цвет плашки. */
export const BLOG_POST_TYPE: Record<string, { label: string; tone: string }> = {
  GUIDE: { label: "Гайд", tone: "bg-sky" },
  EVENT_REPORT: { label: "С тренировки", tone: "bg-secondary" },
};

/** Статус поста: черновик видит только автор. */
export const BLOG_POST_STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: "Черновик", tone: "bg-muted" },
  PUBLISHED: { label: "Опубликован", tone: "bg-mint" },
};

/** Модерация текстов (админка «Модерация»): состояние проверки. */
export const MODERATION_STATUS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "Ждёт проверки", tone: "bg-lavender-soft" },
  CLEAN: { label: "Чисто", tone: "bg-lime-soft" },
  FLAGGED: { label: "На проверке", tone: "bg-peach" },
  AUTO_HIDDEN: { label: "Скрыто автоматически", tone: "bg-salmon" },
  RESOLVED: { label: "Решено", tone: "bg-lime-soft" },
};

/** Вид нарушения, найденный словарём, классификатором или нейросетью. */
export const MODERATION_CATEGORY_LABEL: Record<string, string> = {
  PROFANITY: "Мат",
  INSULT: "Оскорбление",
  HARASSMENT: "Травля",
  HATE: "Ненависть",
  THREAT: "Угроза",
  SEXUAL: "Непристойность",
  SPAM: "Реклама",
  OFF_TOPIC: "Не по теме",
  OTHER: "Другое",
};

/** Кто поставил итоговую оценку; подробности по каждому источнику — в пояснении проверки. */
export const MODERATION_SOURCE_LABEL: Record<string, string> = {
  HEURISTIC: "словарь",
  CLASSIFIER: "классификатор",
  LLM: "нейросеть",
};

/** Что проверяли. */
export const MODERATION_TARGET_LABEL: Record<string, string> = {
  COMMENT: "Сообщение",
  EVENT: "Мероприятие",
  USER_PROFILE: "Профиль",
  ORGANIZATION: "Организация",
};

/** Решение администратора. */
export const MODERATION_DECISION_LABEL: Record<string, string> = {
  APPROVED: "Всё в порядке",
  HIDDEN: "Скрыто",
  ACTION_TAKEN: "Приняты меры",
};

/** Заглушки в обсуждении вместо текста: скрытое модератором и удалённое автором. */
export const COMMENT_HIDDEN_TEXT = "Сообщение скрыто модератором из-за нарушения правил сайта";
export const COMMENT_DELETED_TEXT = "Сообщение удалено";

/** Текст цитаты над ответом: скрытое и удалённое не цитируются. */
export const quoteText = (q: { text?: string; deleted: boolean; hidden: boolean }) =>
  q.deleted ? "сообщение удалено" : q.hidden ? "сообщение скрыто модератором" : q.text;

/**
 * Значок уведомления в «Активности» по типу: иконка и цвет плашки. Цвет не единственный носитель смысла —
 * рядом всегда текст. Тип без записи получает колокольчик (FALLBACK_NOTIFICATION_ICON).
 */
export const NOTIFICATION_ICON: Record<string, { icon: LucideIcon; tone: string }> = {
  REMINDER: { icon: Clock, tone: "bg-lavender-soft" },
  ORG_NEW_EVENT: { icon: CalendarPlus, tone: "bg-lime-soft" },
  EVENT_CHANGED: { icon: PencilLine, tone: "bg-sky-soft" },
  EVENT_UNPUBLISHED: { icon: EyeOff, tone: "bg-peach" },
  EVENT_DELETED: { icon: Trash2, tone: "bg-salmon" },
  EVENT_RESTORED: { icon: RotateCcw, tone: "bg-lime-soft" },
  EVENT_ANNOUNCEMENT: { icon: CircleAlert, tone: "bg-secondary" },
  OCCURRENCE_CANCELLED: { icon: CalendarX, tone: "bg-salmon" },
  OCCURRENCE_RESCHEDULED: { icon: CalendarClock, tone: "bg-sky-soft" },
  OCCURRENCE_CONFIRMED: { icon: CalendarCheck, tone: "bg-lime-soft" },
  QUORUM_REACHED: { icon: UsersRound, tone: "bg-lime-soft" },
  QUORUM_LOST: { icon: UserRoundMinus, tone: "bg-peach" },
  REGISTRATION_CREATED: { icon: UserRoundPlus, tone: "bg-sky-soft" },
  REGISTRATION_CANCELLED: { icon: UserRoundX, tone: "bg-peach" },
  REGISTRATION_APPROVED: { icon: CircleCheck, tone: "bg-lime-soft" },
  REGISTRATION_REJECTED: { icon: CircleX, tone: "bg-salmon" },
  COMMENT_REPLY: { icon: MessageCircleReply, tone: "bg-sky-soft" },
  COMMENT_CREATED: { icon: MessageCircleQuestion, tone: "bg-sky-soft" },
  COMMENT_HIDDEN: { icon: Ban, tone: "bg-peach" },
  ORGANIZATION_SUBMITTED: { icon: FileClock, tone: "bg-sky-soft" },
  ORGANIZATION_APPROVED: { icon: ShieldCheck, tone: "bg-lime-soft" },
  ORGANIZATION_REJECTED: { icon: ShieldX, tone: "bg-salmon" },
  ORGANIZATION_RETURNED: { icon: FilePen, tone: "bg-peach" },
  ORGANIZER_INVITED: { icon: UserRoundPlus, tone: "bg-lime-soft" },
  ORGANIZER_ADDED: { icon: UserRoundCog, tone: "bg-lime-soft" },
  ORGANIZER_REMOVED: { icon: UserRoundMinus, tone: "bg-peach" },
  ORGANIZER_INVITE_DECLINED: { icon: UserRoundX, tone: "bg-peach" },
  ACHIEVEMENT_UNLOCKED: { icon: Trophy, tone: "bg-secondary" },
};
export const FALLBACK_NOTIFICATION_ICON = { icon: Bell, tone: "bg-card" };
