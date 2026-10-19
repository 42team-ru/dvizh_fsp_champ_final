package com.hackathon.app.repository;

import java.time.Instant;
import java.util.*;
import com.hackathon.app.domain.entity.Notification;
import com.hackathon.app.domain.enums.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;

/** Доступ к состоянию уведомлений. */
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    boolean existsByUserIdAndDedupKey(UUID userId, String dedupKey);
    long countByUserIdAndReadAtIsNull(UUID userId);
    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);
    @Query("select n from Notification n where n.userId = :userId and (:unread = false or n.readAt is null) and (n.createdAt < :before or (n.createdAt = :before and n.id < :beforeId)) order by n.createdAt desc, n.id desc")
    List<Notification> page(UUID userId, boolean unread, Instant before, UUID beforeId, Pageable pageable);
    @Query("select n from Notification n where n.userId = :userId and n.readAt is null and n.revision <= :revision")
    List<Notification> unreadThrough(UUID userId, long revision);
    @Query("select distinct n.userId from Notification n where n.createdAt < :cutoff")
    List<UUID> expiredUsers(Instant cutoff);
    List<Notification> findByUserIdAndCreatedAtBefore(UUID userId, Instant cutoff);
}
