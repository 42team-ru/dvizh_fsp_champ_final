package com.hackathon.app.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import com.hackathon.app.config.NotificationProperties;
import com.hackathon.app.domain.entity.*;
import com.hackathon.app.domain.enums.*;
import com.hackathon.app.domain.mapper.NotificationMapper;
import com.hackathon.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Пишет входящие и outbox атомарно с предметным действием. Сетевых вызовов здесь нет. */
@Service
@RequiredArgsConstructor
public class NotificationPublisher {
    private final AppUserRepository users;
    private final NotificationRepository notifications;
    private final NotificationInboxRepository inboxes;
    private final NotificationSettingsRepository settings;
    private final NotificationDeliveryRepository deliveries;
    private final TelegramBindingRepository bindings;
    private final UserPreferencesRepository preferences;
    private final NotificationMapper mapper;
    private final DbTimeRepository dbTime;
    private final NotificationProperties properties;

    @Transactional(propagation = Propagation.MANDATORY)
    public void publish(List<NotificationFact> facts) {
        var recipients = facts.stream().flatMap(f -> f.recipients().stream())
                .distinct().sorted().toList();
        // Один порядок блокировок на весь пакет, в том числе для первого входящего пользователя.
        var states = new HashMap<UUID, NotificationInbox>();
        for (var id : recipients) {
            var user = users.findByIdForUpdate(id).orElse(null);
            if (user != null && user.isActive()) {
                states.put(id, inboxes.lock(id).orElseGet(() -> inboxes.saveAndFlush(mapper.inbox(id, 0))));
            }
        }
        var now = dbTime.now();
        for (var fact : facts) {
            for (var userId : fact.recipients().stream().sorted().toList()) {
                var inbox = states.get(userId);
                if (inbox == null || userId.equals(fact.actorId())
                        || notifications.existsByUserIdAndDedupKey(userId, fact.key())) continue;
                if (fact.category() == NotificationCategory.REMINDERS && !remindersEnabled(userId)) continue;
                mapper.revision(inbox, inbox.getRevision() + 1);
                var notification = notifications.saveAndFlush(mapper.notification(userId, fact.actorId(), fact.type(),
                        fact.category(), fact.key(), fact.title(), fact.body(), fact.targetPath(), fact.eventId(),
                        fact.occurrenceId(), fact.organizationId(), fact.expectedStartAt(), inbox.getRevision()));
                var prefs = settings.findByUserId(userId).orElse(null);
                if (prefs == null || !prefs.getCategories().contains(fact.category())) continue;
                for (var channel : prefs.getChannels()) {
                    var binding = channel == NotificationChannel.TELEGRAM ? bindings.findByUserId(userId).orElse(null) : null;
                    if (channel == NotificationChannel.TELEGRAM && (!properties.telegram().enabled() || binding == null)) continue;
                    deliveries.save(mapper.delivery(notification.getId(), userId, channel,
                            binding == null ? null : binding.getId(), binding == null ? null : binding.getChatId(),
                            null, notification.getId() + ":" + channel, now, now.plus(1, ChronoUnit.DAYS)));
                }
            }
        }
    }

    public boolean remindersEnabled(UUID userId) {
        return preferences.findByUserId(userId).map(UserPreferences::isReminders).orElse(true);
    }
}
