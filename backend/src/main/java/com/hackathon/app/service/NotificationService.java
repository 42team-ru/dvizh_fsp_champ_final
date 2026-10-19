package com.hackathon.app.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import com.hackathon.app.config.NotificationProperties;
import com.hackathon.app.domain.dto.*;
import com.hackathon.app.domain.entity.*;
import com.hackathon.app.domain.enums.*;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.mapper.NotificationMapper;
import com.hackathon.app.domain.mapper.UserMapper;
import com.hackathon.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Собственные входящие и настройки; ревизия включает создание, прочтение и удаление истории. */
@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notifications;
    private final NotificationInboxRepository inboxes;
    private final NotificationSettingsRepository settings;
    private final TelegramBindingRepository bindings;
    private final AppUserRepository users;
    private final NotificationPublisher publisher;
    private final NotificationCancellation cancellation;
    private final NotificationMapper mapper;
    private final NotificationProperties properties;
    private final DbTimeRepository dbTime;
    private final UserMapper userMapper;

    /** Непрочитанные уведомления по типам — для счётчиков на вкладках активности. */
    @Transactional(readOnly = true)
    public List<NotificationTypeCountResponse> unreadCounts(UUID userId) {
        return notifications.unreadByType(userId).stream()
                .map(c -> new NotificationTypeCountResponse(c.getType(), c.getUnread())).toList();
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public NotificationPageResponse list(UUID userId, String cursor, int size, boolean unreadOnly, Set<NotificationType> types) {
        var revision = revision(userId);
        var before = Instant.parse("9999-12-31T00:00:00Z");
        var beforeId = new UUID(-1L, -1L);
        if (cursor != null) {
            try {
                var parts = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split("\\|", -1);
                if (parts.length != 2) throw new IllegalArgumentException();
                before = Instant.parse(parts[0]);
                beforeId = UUID.fromString(parts[1]);
            } catch (RuntimeException invalid) { throw new BadRequestException("Некорректный курсор уведомлений"); }
        }
        int limit = Math.clamp(size, 1, 100);
        var allTypes = types == null || types.isEmpty();
        var page = notifications.page(userId, unreadOnly, allTypes, allTypes ? Set.of(NotificationType.REMINDER) : types,
                before, beforeId, PageRequest.of(0, limit + 1));
        boolean more = page.size() > limit;
        var items = page.stream().limit(limit).toList();
        String next = null;
        if (more) {
            var last = items.getLast();
            next = Base64.getUrlEncoder().withoutPadding().encodeToString(
                    (last.getCreatedAt() + "|" + last.getId()).getBytes(StandardCharsets.UTF_8));
        }
        // Авторы одним запросом: имя и аватар для строки «Саша ответила…».
        var actors = users.findAllById(items.stream().map(Notification::getActorId).filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(AppUser::getId, userMapper::toShort));
        return new NotificationPageResponse(items.stream().map(n -> mapper.response(n, actors.get(n.getActorId()))).toList(), next,
                notifications.countByUserIdAndReadAtIsNull(userId), revision);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public NotificationPollResponse snapshot(UUID userId, long knownRevision) {
        long revision = revision(userId);
        return new NotificationPollResponse(revision != knownRevision, revision,
                notifications.countByUserIdAndReadAtIsNull(userId));
    }

    @Transactional
    public NotificationPollResponse read(UUID userId, UUID id) {
        var inbox = lockInbox(userId);
        var notification = notifications.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Уведомление не найдено"));
        boolean changed = notification.getReadAt() == null;
        if (changed) {
            mapper.read(notification, dbTime.now());
            mapper.revision(inbox, inbox.getRevision() + 1);
            notifications.flush();
        }
        return new NotificationPollResponse(changed, inbox.getRevision(), notifications.countByUserIdAndReadAtIsNull(userId));
    }

    @Transactional
    public NotificationPollResponse readAll(UUID userId, long throughRevision) {
        var inbox = lockInbox(userId);
        if (throughRevision > inbox.getRevision()) throw new BadRequestException("Ревизия ещё не существует");
        var unread = notifications.unreadThrough(userId, throughRevision);
        boolean changed = !unread.isEmpty();
        if (changed) {
            var now = dbTime.now();
            unread.forEach(n -> mapper.read(n, now));
            mapper.revision(inbox, inbox.getRevision() + 1);
            notifications.flush();
        }
        return new NotificationPollResponse(changed, inbox.getRevision(), notifications.countByUserIdAndReadAtIsNull(userId));
    }

    @Transactional(readOnly = true)
    public NotificationSettingsResponse settings(UUID userId) {
        var stored = settings.findByUserId(userId).orElse(null);
        var connected = bindings.findByUserId(userId).isPresent();
        var channels = stored == null ? Set.<NotificationChannel>of() : Set.copyOf(stored.getChannels());
        var categories = stored == null ? EnumSet.allOf(NotificationCategory.class) : Set.copyOf(stored.getCategories());
        return new NotificationSettingsResponse(channels, categories, publisher.remindersEnabled(userId), List.of(
                new NotificationSettingsResponse.Channel(NotificationChannel.TELEGRAM, "REAL", properties.telegram().enabled(), connected),
                new NotificationSettingsResponse.Channel(NotificationChannel.MAX, "MOCK", true, true),
                new NotificationSettingsResponse.Channel(NotificationChannel.EMAIL, "MOCK", true, true)));
    }

    @Transactional
    public NotificationSettingsResponse saveSettings(UUID userId, SaveNotificationSettingsRequest request) {
        users.findByIdForUpdate(userId).orElseThrow();
        if (request.channels().contains(NotificationChannel.TELEGRAM)
                && (!properties.telegram().enabled() || bindings.findByUserId(userId).isEmpty()))
            throw new ConflictException("Сначала подключите Telegram");
        var stored = settings.findByUserId(userId).orElseGet(() -> mapper.settings(userId, Set.of(), EnumSet.allOf(NotificationCategory.class)));
        mapper.settings(stored, request.channels(), request.categories());
        settings.saveAndFlush(stored);
        cancellation.settings(userId, request.channels(), request.categories());
        return settings(userId);
    }

    private long revision(UUID userId) {
        return inboxes.findByUserId(userId).map(NotificationInbox::getRevision).orElse(0L);
    }

    private NotificationInbox lockInbox(UUID userId) {
        users.findByIdForUpdate(userId).orElseThrow();
        return inboxes.lock(userId).orElseGet(() -> inboxes.saveAndFlush(mapper.inbox(userId, 0)));
    }
}
