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
@Table(name = "notification_settings")
@Getter
@Setter
@NoArgsConstructor
public class NotificationSettings extends AuditEntity {
    /** Идентификатор. */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /** Владелец. */
    private UUID userId;
    /** Включённые внешние каналы. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "notification_setting_channels", joinColumns = @JoinColumn(name = "settings_id"))
    @Column(name = "channel")
    @Enumerated(EnumType.STRING)
    private Set<NotificationChannel> channels;
    /** Включённые категории внешней доставки. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "notification_setting_categories", joinColumns = @JoinColumn(name = "settings_id"))
    @Column(name = "category")
    @Enumerated(EnumType.STRING)
    private Set<NotificationCategory> categories;
}
