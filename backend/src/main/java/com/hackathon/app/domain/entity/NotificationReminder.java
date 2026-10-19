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
@Table(name = "notification_reminders")
@Getter
@Setter
@NoArgsConstructor
public class NotificationReminder extends AuditEntity {
    /** Идентификатор. */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /** Мероприятие. */
    private UUID eventId;
    /** Занятие. */
    private UUID occurrenceId;
    /** Начало, для которого запланировано. */
    private Instant expectedStartAt;
    /** Интервал до начала. */
    private int offsetMinutes;
    /** Плановый срок. */
    private Instant dueAt;
    /** Обработано или отменено. */
    private Instant finishedAt;
    /** Ключ поколения расписания. */
    @Column(length = 200)
    private String dedupKey;
}
