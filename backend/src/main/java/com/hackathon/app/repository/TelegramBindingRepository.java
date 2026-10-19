package com.hackathon.app.repository;

import java.time.Instant;
import java.util.*;
import com.hackathon.app.domain.entity.TelegramBinding;
import com.hackathon.app.domain.enums.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;

/** Доступ к состоянию уведомлений. */
public interface TelegramBindingRepository extends JpaRepository<TelegramBinding, UUID> {
    Optional<TelegramBinding> findByUserId(UUID userId);
    Optional<TelegramBinding> findByTelegramUserId(Long telegramUserId);
    Optional<TelegramBinding> findByChatId(Long chatId);
}
