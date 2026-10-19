package com.hackathon.app.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import com.hackathon.app.config.NotificationProperties;
import com.hackathon.app.domain.entity.Notification;
import com.hackathon.app.domain.mapper.NotificationMapper;
import com.hackathon.app.repository.*;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Очистка ограничивает объём истории; состояние ревизии остаётся после удаления сообщений. */
@Service
@RequiredArgsConstructor
public class NotificationMaintenance {
    private final NotificationRepository notifications;
    private final NotificationInboxRepository inboxes;
    private final NotificationDeliveryRepository deliveries;
    private final NotificationReminderRepository reminders;
    private final TelegramLinkTokenRepository tokens;
    private final TelegramUpdateReceiptRepository receipts;
    private final TelegramRateLimitRepository limits;
    private final AppUserRepository users;
    private final NotificationMapper mapper;
    private final NotificationProperties properties;
    private final DbTimeRepository dbTime;
    private final MeterRegistry metrics;

    @Transactional
    public void initialize() {
        if (limits.lock("bot").isEmpty()) limits.saveAndFlush(mapper.rateLimit("bot", Instant.EPOCH));
    }

    public void measure() {
        for (var state : com.hackathon.app.domain.enums.NotificationDeliveryStatus.values()) {
            var count = deliveries.countByStatus(state);
            metrics.gauge("notifications.queue.size", List.of(io.micrometer.core.instrument.Tag.of("status", state.name())),
                    gauges.computeIfAbsent(state.name(), ignored -> new java.util.concurrent.atomic.AtomicLong())).set(count);
        }
        var oldest = deliveries.oldestPending();
        age.set(oldest == null ? 0 : Math.max(0, java.time.Duration.between(oldest, dbTime.now()).toSeconds()));
        metrics.gauge("notifications.queue.oldest.seconds", age);
    }
    private final Map<String, java.util.concurrent.atomic.AtomicLong> gauges = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.concurrent.atomic.AtomicLong age = new java.util.concurrent.atomic.AtomicLong();

    public List<UUID> expiredUsers() {
        return notifications.expiredUsers(dbTime.now().minus(properties.retentionDays(), ChronoUnit.DAYS));
    }

    @Transactional
    public void cleanUser(UUID userId) {
        users.findByIdForUpdate(userId).orElseThrow();
        var expired = notifications.findByUserIdAndCreatedAtBefore(userId, dbTime.now().minus(properties.retentionDays(), ChronoUnit.DAYS));
        if (expired.isEmpty()) return;
        var state = inboxes.lock(userId).orElseThrow();
        var ids = expired.stream().map(Notification::getId).toList();
        deliveries.deleteAll(deliveries.findByNotificationIdIn(ids));
        deliveries.flush();
        notifications.deleteAll(expired);
        mapper.revision(state, state.getRevision() + 1);
    }

    @Transactional
    public void cleanTransportHistory() {
        var cutoff = dbTime.now().minus(properties.retentionDays(), ChronoUnit.DAYS);
        deliveries.deleteAll(deliveries.findByCompletedAtBefore(cutoff));
        reminders.deleteAll(reminders.findByFinishedAtBefore(cutoff));
        tokens.deleteAll(tokens.findByExpiresAtBefore(cutoff));
        receipts.deleteAll(receipts.findByCreatedAtBefore(cutoff));
    }
}
