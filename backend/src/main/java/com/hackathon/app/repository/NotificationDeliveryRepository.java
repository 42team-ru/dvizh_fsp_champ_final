package com.hackathon.app.repository;

import java.time.Instant;
import java.util.*;
import com.hackathon.app.domain.entity.NotificationDelivery;
import com.hackathon.app.domain.enums.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;

/** Доступ к состоянию уведомлений. */
public interface NotificationDeliveryRepository extends JpaRepository<NotificationDelivery, UUID> {
    @Query("select d.id from NotificationDelivery d where d.userId = :userId and d.status in :statuses")
    List<UUID> activeIds(UUID userId, Collection<NotificationDeliveryStatus> statuses);
    List<NotificationDelivery> findByUserIdAndStatusIn(UUID userId, Collection<NotificationDeliveryStatus> statuses);
    boolean existsByDedupKey(String dedupKey);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from NotificationDelivery d where d.id = :id")
    Optional<NotificationDelivery> lock(UUID id);
    @Query("select d.id from NotificationDelivery d where (d.status = com.hackathon.app.domain.enums.NotificationDeliveryStatus.PENDING and d.nextAttemptAt <= :now) or (d.status = com.hackathon.app.domain.enums.NotificationDeliveryStatus.PROCESSING and d.leaseUntil <= :now) order by d.nextAttemptAt, d.id")
    List<UUID> due(Instant now, Pageable pageable);
    List<NotificationDelivery> findByNotificationIdIn(Collection<UUID> ids);
    List<NotificationDelivery> findByCompletedAtBefore(Instant cutoff);
    long countByStatus(NotificationDeliveryStatus status);
    @Query("select min(d.createdAt) from NotificationDelivery d where d.status = com.hackathon.app.domain.enums.NotificationDeliveryStatus.PENDING")
    Instant oldestPending();
}
