package com.hackathon.app.service;

import com.hackathon.app.domain.enums.*;

/** Контракт канала; бизнес-поводы и получатели от реализации транспорта не зависят. */
public interface NotificationTransport {
    NotificationChannel channel();
    Result send(Long chatId, String text);
    /** Подтверждение провайдера или явная заглушка. */
    record Result(NotificationDeliveryStatus status, Long messageId) {}
}
