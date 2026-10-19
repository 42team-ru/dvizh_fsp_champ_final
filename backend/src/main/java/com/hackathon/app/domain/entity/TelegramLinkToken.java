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
@Table(name = "telegram_link_tokens")
@Getter
@Setter
@NoArgsConstructor
public class TelegramLinkToken extends AuditEntity {
    /** Идентификатор. */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /** Владелец ссылки. */
    private UUID userId;
    /** SHA-256 одноразового токена. */
    @Column(length = 64)
    private String tokenHash;
    /** Окончание срока действия. */
    private Instant expiresAt;
    /** Когда ссылка использована или отозвана. */
    private Instant usedAt;
}
