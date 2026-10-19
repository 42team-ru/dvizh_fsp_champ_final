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
@Table(name = "telegram_update_receipts")
@Getter
@Setter
@NoArgsConstructor
public class TelegramUpdateReceipt extends AuditEntity {
    /** Идентификатор. */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /** Обработанный update Telegram. */
    private Long updateId;
}
