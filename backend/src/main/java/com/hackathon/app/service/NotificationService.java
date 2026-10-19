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
        var binding = bindings.findByUserId(userId).orElse(null);
        var channels = stored == null ? Set.<NotificationChannel>of() : Set.copyOf(stored.getChannels());
        var categories = stored == null ? EnumSet.allOf(NotificationCategory.class) : Set.copyOf(stored.getCategories());
        return new NotificationSettingsResponse(channels, categories, publisher.remindersEnabled(userId), List.of(
                new NotificationSettingsResponse.Channel(NotificationChannel.TELEGRAM, "REAL", properties.telegram().enabled(), binding != null,
                        binding == null || binding.getUsername() == null ? null : "@" + binding.getUsername()),
                new NotificationSettingsResponse.Channel(NotificationChannel.MAX, "MOCK", true, stored != null && stored.getMaxPhone() != null, stored == null ? null : stored.getMaxPhone()),
                new NotificationSettingsResponse.Channel(NotificationChannel.EMAIL, "MOCK", true, stored != null && stored.getEmail() != null, stored == null ? null : stored.getEmail())));
    }

    @Transactional
    public NotificationSettingsResponse saveSettings(UUID userId, SaveNotificationSettingsRequest request) {
        users.findByIdForUpdate(userId).orElseThrow();
        if (request.channels().contains(NotificationChannel.TELEGRAM)
                && (!properties.telegram().enabled() || bindings.findByUserId(userId).isEmpty()))
            throw new ConflictException("Сначала подключите Telegram");
        var stored = settings.findByUserId(userId).orElseGet(() -> mapper.settings(userId, Set.of(), EnumSet.allOf(NotificationCategory.class)));
        if (request.channels().contains(NotificationChannel.EMAIL) && stored.getEmail() == null)
            throw new ConflictException("Сначала укажите почту");
        if (request.channels().contains(NotificationChannel.MAX) && stored.getMaxPhone() == null)
            throw new ConflictException("Сначала укажите номер MAX");
        mapper.settings(stored, request.channels(), request.categories());
        settings.saveAndFlush(stored);
        cancellation.settings(userId, request.channels(), request.categories());
        return settings(userId);
    }

    /** Подключение и отключение заглушек атомарны с изменением внешних каналов. */
    @Transactional
    public NotificationSettingsResponse connectEmail(UUID userId, ConnectNotificationEmailRequest request) {
        return mockChannel(userId, NotificationChannel.EMAIL, request.email().strip());
    }

    @Transactional
    public NotificationSettingsResponse disconnectEmail(UUID userId) {
        return mockChannel(userId, NotificationChannel.EMAIL, null);
    }

    @Transactional
    public NotificationSettingsResponse connectMax(UUID userId, ConnectNotificationMaxRequest request) {
        var phone = request.phone().replaceAll("[\\s()\\-]", "");
        if (phone.matches("8[0-9]{10}")) phone = "+7" + phone.substring(1);
        if (!phone.matches("\\+7[0-9]{10}")) throw new BadRequestException("Неверный номер телефона");
        return mockChannel(userId, NotificationChannel.MAX, phone);
    }

    @Transactional
    public NotificationSettingsResponse disconnectMax(UUID userId) {
        return mockChannel(userId, NotificationChannel.MAX, null);
    }

    private NotificationSettingsResponse mockChannel(UUID userId, NotificationChannel channel, String target) {
        users.findByIdForUpdate(userId).orElseThrow();
        var stored = settings.findByUserId(userId).orElseGet(() ->
                mapper.settings(userId, Set.of(), EnumSet.allOf(NotificationCategory.class)));
        if (channel == NotificationChannel.EMAIL) mapper.email(stored, target);
        else mapper.maxPhone(stored, target);
        var channels = new HashSet<>(stored.getChannels());
        if (target == null) channels.remove(channel);
        else channels.add(channel);
        mapper.settings(stored, channels, Set.copyOf(stored.getCategories()));
        settings.saveAndFlush(stored);
        cancellation.settings(userId, channels, stored.getCategories());
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
