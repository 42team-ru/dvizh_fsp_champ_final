package com.hackathon.app.service;

import com.hackathon.app.domain.enums.*;

/** Контракт канала; бизнес-поводы и получатели от реализации транспорта не зависят. */
public interface NotificationTransport {
    NotificationChannel channel();
    /** photo — картинка к сообщению; null — только текст. Канал без картинок её игнорирует. */
    Result send(Long chatId, String text, Photo photo);
    /** Подтверждение провайдера или явная заглушка. */
    record Result(NotificationDeliveryStatus status, Long messageId) {}
    /** Картинка: файл из хранилища (objectKey) или ресурс приложения (resource), например иллюстрация вида спорта. */
    record Photo(String objectKey, String resource, String contentType) {}
}
