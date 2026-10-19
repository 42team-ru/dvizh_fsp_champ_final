package com.hackathon.app.repository;

import java.time.Instant;
import java.util.*;
import com.hackathon.app.domain.entity.NotificationInbox;
import com.hackathon.app.domain.enums.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;

/** Доступ к состоянию уведомлений. */
public interface NotificationInboxRepository extends JpaRepository<NotificationInbox, UUID> {
    Optional<NotificationInbox> findByUserId(UUID userId);
    List<NotificationInbox> findByUserIdIn(Collection<UUID> userIds);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from NotificationInbox i where i.userId = :userId")
    Optional<NotificationInbox> lock(UUID userId);
}
