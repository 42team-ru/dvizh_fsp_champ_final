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
@Table(name = "telegram_rate_limits")
@Getter
@Setter
@NoArgsConstructor
public class TelegramRateLimit extends AuditEntity {
    /** Идентификатор. */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /** Бот или чат. */
    @Column(length = 100)
    private String scope;
    /** Когда можно отправлять снова. */
    private Instant availableAt;
}
