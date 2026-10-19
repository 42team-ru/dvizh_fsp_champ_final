package com.hackathon.app.repository;

import java.time.Instant;
import java.util.*;
import com.hackathon.app.domain.entity.TelegramLinkToken;
import com.hackathon.app.domain.enums.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;

/** Доступ к состоянию уведомлений. */
public interface TelegramLinkTokenRepository extends JpaRepository<TelegramLinkToken, UUID> {
    List<TelegramLinkToken> findByUserIdAndUsedAtIsNull(UUID userId);
    Optional<TelegramLinkToken> findByTokenHash(String tokenHash);
    List<TelegramLinkToken> findByExpiresAtBefore(Instant cutoff);
}
