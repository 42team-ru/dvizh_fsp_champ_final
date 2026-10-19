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
@Table(name = "telegram_bindings")
@Getter
@Setter
@NoArgsConstructor
public class TelegramBinding extends AuditEntity {
    /** Идентификатор. */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /** Аккаунт сайта. */
    private UUID userId;
    /** Пользователь Telegram. */
    private Long telegramUserId;
    /** Личный чат. */
    private Long chatId;
    /** Публичное имя Telegram. */
    private String username;
}
