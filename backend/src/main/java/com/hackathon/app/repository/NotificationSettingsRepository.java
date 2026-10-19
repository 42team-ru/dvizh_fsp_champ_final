package com.hackathon.app.repository;

import java.time.Instant;
import java.util.*;
import com.hackathon.app.domain.entity.NotificationSettings;
import com.hackathon.app.domain.enums.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;

/** Доступ к состоянию уведомлений. */
public interface NotificationSettingsRepository extends JpaRepository<NotificationSettings, UUID> {
    Optional<NotificationSettings> findByUserId(UUID userId);
}
