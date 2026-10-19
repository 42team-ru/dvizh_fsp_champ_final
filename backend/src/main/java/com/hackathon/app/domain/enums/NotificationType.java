package com.hackathon.app.domain.enums;

/** Значения подсистемы уведомлений. */
public enum NotificationType {
    /** Скоро начало. */
    REMINDER,
    /** Карточка или расписание изменены. */
    EVENT_CHANGED,
    /** Снято с публикации. */
    EVENT_UNPUBLISHED,
    /** Удалено. */
    EVENT_DELETED,
    /** Занятие отменено. */
    OCCURRENCE_CANCELLED,
    /** Занятие перенесено. */
    OCCURRENCE_RESCHEDULED,
    /** Новая запись или заявка. */
    REGISTRATION_CREATED,
    /** Участник отменил запись. */
    REGISTRATION_CANCELLED,
    /** Запись подтверждена. */
    REGISTRATION_APPROVED,
    /** Заявка отклонена или участник исключён. */
    REGISTRATION_REJECTED,
    /** Ответ на сообщение. */
    COMMENT_REPLY,
    /** Анкета поступила на проверку. */
    ORGANIZATION_SUBMITTED,
    /** Организация одобрена. */
    ORGANIZATION_APPROVED,
    /** Организация отклонена. */
    ORGANIZATION_REJECTED,
    /** Добавлен соорганизатор. */
    ORGANIZER_ADDED,
    /** Соорганизатор удалён или вышел. */
    ORGANIZER_REMOVED,
    /** Кворум набран. */
    QUORUM_REACHED,
    /** Кворума пока не хватает. */
    QUORUM_LOST,
    /** Организатор подтвердил занятие. */
    OCCURRENCE_CONFIRMED
}
