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
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
public class Notification extends AuditEntity {
    /** Идентификатор. */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /** Получатель. */
    private UUID userId;
    /** Инициатор, null для системы. */
    private UUID actorId;
    /** Повод. */
    @Enumerated(EnumType.STRING)
    private NotificationType type;
    /** Категория. */
    @Enumerated(EnumType.STRING)
    private NotificationCategory category;
    /** Уникальный ключ факта для получателя. */
    @Column(length = 200)
    private String dedupKey;
    /** Заголовок. */
    @Column(length = 500)
    private String title;
    /** Безопасный текст. */
    @Column(length = 4000)
    private String body;
    /** Относительный путь сайта. */
    @Column(length = 500)
    private String targetPath;
    /** Мероприятие. */
    private UUID eventId;
    /** Конкретное занятие. */
    private UUID occurrenceId;
    /** Организация. */
    private UUID organizationId;
    /** Ожидаемое начало для проверки напоминания. */
    private Instant expectedStartAt;
    /** Ревизия создания во входящих. */
    private long revision;
    /** Момент прочтения. */
    private Instant readAt;
}
