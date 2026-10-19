package com.hackathon.app.domain.enums;

/** Значения подсистемы уведомлений. */
public enum NotificationDeliveryStatus {
    /** Ожидает отправки. */
    PENDING,
    /** Зарезервировано обработчиком. */
    PROCESSING,
    /** Отправлено. */
    SENT,
    /** Обработано заглушкой. */
    MOCKED,
    /** Потеряло актуальность или отключено. */
    SKIPPED,
    /** Неустранимая ошибка или истёк срок. */
    DEAD
}
