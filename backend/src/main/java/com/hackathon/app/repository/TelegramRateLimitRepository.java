package com.hackathon.app.repository;

import java.time.Instant;
import java.util.*;
import com.hackathon.app.domain.entity.TelegramRateLimit;
import com.hackathon.app.domain.enums.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;

/** Доступ к состоянию уведомлений. */
public interface TelegramRateLimitRepository extends JpaRepository<TelegramRateLimit, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from TelegramRateLimit r where r.scope = :scope")
    Optional<TelegramRateLimit> lock(String scope);
}
