package com.hackathon.app.domain.entity;

import java.time.Instant;
import java.util.UUID;
import java.util.Set;
import com.hackathon.app.domain.enums.*;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

/** Состояние подсистемы уведомлений. */
@Entity
@Table(name = "notification_deliveries")
@Getter
@Setter
@NoArgsConstructor
public class NotificationDelivery extends AuditEntity {
    /** Идентификатор. */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /** Уведомление, null для ответа бота. */
    private UUID notificationId;
    /** Получатель. */
    private UUID userId;
    /** Канал доставки. */
    @Enumerated(EnumType.STRING)
    private NotificationChannel channel;
    /** Состояние. */
    @Enumerated(EnumType.STRING)
    private NotificationDeliveryStatus status;
    /** Версия привязки Telegram. */
    private UUID bindingId;
    /** Чат для ответа бота или привязки. */
    private Long chatId;
    /** Текст ответа бота, если нет уведомления. */
    @Column(length = 4000)
    private String text;
    /** Ключ доставки. */
    @Column(length = 250)
    private String dedupKey;
    /** Число попыток. */
    private int attempts;
    /** Следующая попытка. */
    private Instant nextAttemptAt;
    /** Срок резервирования. */
    private Instant leaseUntil;
    /** Владелец текущей попытки. */
    private UUID leaseToken;
    /** Предельный срок отправки. */
    private Instant expiresAt;
    /** Время завершения. */
    private Instant completedAt;
    /** Безопасная диагностика. */
    @Column(length = 500)
    private String lastError;
    /** Идентификатор сообщения провайдера. */
    private Long messageId;
}
