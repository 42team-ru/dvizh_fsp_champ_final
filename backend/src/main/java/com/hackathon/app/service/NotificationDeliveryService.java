package com.hackathon.app.service;

import static com.hackathon.app.util.NotificationTimes.stored;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import com.hackathon.app.config.NotificationProperties;
import com.hackathon.app.domain.entity.*;
import com.hackathon.app.domain.enums.*;
import com.hackathon.app.domain.mapper.NotificationMapper;
import com.hackathon.app.repository.*;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Короткие транзакции claim/finish; HTTP выполняется обработчиком между ними без блокировок БД. */
@Service
@RequiredArgsConstructor
public class NotificationDeliveryService {
    private final NotificationDeliveryRepository deliveries;
    private final NotificationRepository notifications;
    private final NotificationSettingsRepository settings;
    private final TelegramBindingRepository bindings;
    private final TelegramRateLimitRepository limits;
    private final AppUserRepository users;
    private final EventRepository events;
    private final EventOccurrenceRepository occurrences;
    private final RegistrationRepository registrations;
    private final OccurrenceAttendanceRepository attendances;
    private final EventAccessPolicy policy;
    private final NotificationPublisher publisher;
    private final NotificationMapper mapper;
    private final DbTimeRepository dbTime;
    private final NotificationProperties properties;
    private final MeterRegistry metrics;

    /** Данные одной попытки, включая fencing token. */
    public record Claim(UUID id, UUID leaseToken, UUID userId, UUID bindingId,
                        NotificationChannel channel, Long chatId, String text) {}

    public List<UUID> due() { return deliveries.due(dbTime.now(), PageRequest.of(0, 100)); }

    @Transactional
    public Claim claim(UUID id) {
        // Тот же порядок bot → delivery для всех обработчиков; rate limit действует между репликами.
        var botLimit = limits.lock("bot").orElse(null);
        if (botLimit == null) return null;
        var d = deliveries.lock(id).orElse(null);
        var now = dbTime.now();
        if (d == null || !(d.getStatus() == NotificationDeliveryStatus.PENDING && !d.getNextAttemptAt().isAfter(now)
                || d.getStatus() == NotificationDeliveryStatus.PROCESSING && !d.getLeaseUntil().isAfter(now))) return null;
        if (!d.getExpiresAt().isAfter(now)) {
            mapper.finish(d, NotificationDeliveryStatus.DEAD, now, "Истёк срок доставки", null); return null;
        }
        var notification = d.getNotificationId() == null ? null : notifications.findById(d.getNotificationId()).orElse(null);
        if (d.getNotificationId() != null && (notification == null || !enabled(notification, d))) {
            mapper.finish(d, NotificationDeliveryStatus.SKIPPED, now, "Канал отключён или уведомление неактуально", null); return null;
        }
        if (d.getChannel() == NotificationChannel.TELEGRAM) {
            if (!properties.telegram().enabled()) {
                mapper.finish(d, NotificationDeliveryStatus.SKIPPED, now, "Telegram отключён", null); return null;
            }
            String scope = "chat:" + d.getChatId();
            var chatLimit = limits.lock(scope).orElseGet(() -> limits.saveAndFlush(mapper.rateLimit(scope, Instant.EPOCH)));
            var available = botLimit.getAvailableAt().isAfter(chatLimit.getAvailableAt()) ? botLimit.getAvailableAt() : chatLimit.getAvailableAt();
            if (available.isAfter(now)) {
                mapper.retry(d, available, "Ограничение частоты отправки"); return null;
            }
            mapper.rateLimit(botLimit, now.plusMillis(50));
            mapper.rateLimit(chatLimit, now.plusSeconds(1));
        }
        var token = UUID.randomUUID();
        mapper.claim(d, token, now.plusSeconds(60), d.getAttempts() + 1);
        String text = d.getText();
        if (notification != null) {
            var link = properties.publicUrl().resolve(notification.getTargetPath()).toString();
            var content = notification.getTitle() + "\n" + notification.getBody();
            // Telegram принимает не более 4096 символов; ссылка сохраняется целиком.
            int budget = Math.max(0, 4000 - link.length());
            text = content.substring(0, Math.min(content.length(), budget)) + "\n" + link;
        }
        return new Claim(d.getId(), token, d.getUserId(), d.getBindingId(), d.getChannel(), d.getChatId(), text);
    }

    @Transactional
    public void complete(Claim claim, NotificationTransport.Result result) {
        var d = owned(claim);
        if (d == null) return;
        mapper.finish(d, result.status(), dbTime.now(), null, result.messageId());
        metrics.counter("notifications.delivery.completed", "channel", d.getChannel().name(), "status", result.status().name()).increment();
    }

    @Transactional
    public void failed(Claim claim, NotificationTransportException error) {
        var d = owned(claim);
        if (d == null) return;
        var now = dbTime.now();
        metrics.counter("notifications.delivery.errors", "channel", d.getChannel().name()).increment();
        if (!error.retryable() || !d.getExpiresAt().isAfter(now)) {
            mapper.finish(d, NotificationDeliveryStatus.DEAD, now, error.getMessage(), null); return;
        }
        long backoff = Math.min(1800L, 5L * (1L << Math.min(20, d.getAttempts() - 1)));
        long seconds = Math.max(error.retryAfterSeconds(), backoff + ThreadLocalRandom.current().nextLong(Math.max(1, backoff / 4)));
        var next = now.plusSeconds(seconds);
        mapper.retry(d, next.isAfter(d.getExpiresAt()) ? d.getExpiresAt() : next, error.getMessage());
    }

    private NotificationDelivery owned(Claim claim) {
        var d = deliveries.lock(claim.id()).orElse(null);
        return d != null && d.getStatus() == NotificationDeliveryStatus.PROCESSING
                && claim.leaseToken().equals(d.getLeaseToken()) ? d : null;
    }

    private boolean enabled(Notification n, NotificationDelivery d) {
        if (users.findById(n.getUserId()).filter(AppUser::isActive).isEmpty()) return false;
        var prefs = settings.findByUserId(n.getUserId()).orElse(null);
        if (prefs == null || !prefs.getChannels().contains(d.getChannel()) || !prefs.getCategories().contains(n.getCategory())) return false;
        if (d.getChannel() == NotificationChannel.TELEGRAM && bindings.findByUserId(n.getUserId())
                .filter(b -> b.getId().equals(d.getBindingId()) && b.getChatId().equals(d.getChatId())).isEmpty()) return false;
        if (n.getType() != NotificationType.REMINDER) return true;
        if (!publisher.remindersEnabled(n.getUserId())) return false;
        var event = events.findById(n.getEventId()).orElse(null);
        var occurrence = occurrences.findById(n.getOccurrenceId()).orElse(null);
        if (event == null || occurrence == null || event.getStatus() != EventStatus.PUBLISHED
                || occurrence.getStatus() != OccurrenceStatus.SCHEDULED || !occurrence.getStartAt().isAfter(dbTime.now())
                || !stored(occurrence.getStartAt()).equals(n.getExpectedStartAt())) return false;
        if (policy.isOrganizer(event, n.getUserId())) return true;
        return registrations.findByEventIdAndUserId(event.getId(), n.getUserId())
                .filter(r -> r.getStatus() == RegistrationStatus.CONFIRMED).isPresent()
                && (!event.isRecurring() || attendances.findByOccurrenceIdAndUserId(occurrence.getId(), n.getUserId()).isPresent());
    }
}
