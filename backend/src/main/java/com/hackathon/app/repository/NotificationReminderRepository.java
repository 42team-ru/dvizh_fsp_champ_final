package com.hackathon.app.repository;

import java.time.Instant;
import java.util.*;
import com.hackathon.app.domain.entity.NotificationReminder;
import com.hackathon.app.domain.enums.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;

/** Доступ к состоянию уведомлений. */
public interface NotificationReminderRepository extends JpaRepository<NotificationReminder, UUID> {
    @Query("select r.eventId from NotificationReminder r where r.id = :id")
    Optional<UUID> findEventId(UUID id);
    List<NotificationReminder> findByEventIdAndFinishedAtIsNull(UUID eventId);
    boolean existsByDedupKey(String dedupKey);
    List<NotificationReminder> findByOccurrenceIdAndFinishedAtIsNull(UUID occurrenceId);
    @Query("select r.id from NotificationReminder r where r.finishedAt is null and r.dueAt <= :now order by r.dueAt")
    List<UUID> due(Instant now, Pageable pageable);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from NotificationReminder r where r.id = :id")
    Optional<NotificationReminder> lock(UUID id);
    List<NotificationReminder> findByFinishedAtBefore(Instant cutoff);
}
