package com.hackathon.app.e2e.support;

import java.time.Instant;
import java.util.UUID;
import com.hackathon.app.domain.entity.Notification;
import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

/** Подготовка исторических дат: @CreationTimestamp не позволяет заменить их обычным save. */
@Transactional
public interface NotificationTestDataRepository extends Repository<Notification, UUID> {
    @Modifying
    @Query("update Notification n set n.createdAt = :time where n.id = :id")
    int notificationCreatedAt(UUID id, Instant time);
    @Modifying
    @Query("update Event e set e.createdAt = :time where e.id = :id")
    int eventCreatedAt(UUID id, Instant time);
    @Modifying
    @Query("update OccurrenceAttendance a set a.createdAt = :time where a.id = :id")
    int attendanceCreatedAt(UUID id, Instant time);
}
