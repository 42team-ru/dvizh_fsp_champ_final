package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.util.*;
import com.hackathon.app.domain.dto.*;
import com.hackathon.app.domain.entity.*;
import com.hackathon.app.domain.enums.*;
import org.mapstruct.*;

/** Все изменения сущностей уведомлений выполняются здесь. */
@Mapper(config = MappingConfig.class)
public interface NotificationMapper {
    Notification notification(UUID userId, UUID actorId, NotificationType type, NotificationCategory category,
            String dedupKey, String title, String body, String targetPath, UUID eventId, UUID occurrenceId,
            UUID organizationId, Instant expectedStartAt, long revision);
    NotificationResponse response(Notification notification);
    NotificationInbox inbox(UUID userId, long revision);
    default void revision(@MappingTarget NotificationInbox inbox, long revision) {
        inbox.setRevision(revision);
    }
    void read(@MappingTarget Notification notification, Instant readAt);
    NotificationSettings settings(UUID userId, Set<NotificationChannel> channels, Set<NotificationCategory> categories);
    void settings(@MappingTarget NotificationSettings settings, Set<NotificationChannel> channels, Set<NotificationCategory> categories);
    @Mapping(target = "status", constant = "PENDING")
    NotificationDelivery delivery(UUID notificationId, UUID userId, NotificationChannel channel, UUID bindingId,
            Long chatId, String text, String dedupKey, Instant nextAttemptAt, Instant expiresAt);
    @Mapping(target = "status", constant = "PROCESSING")
    void claim(@MappingTarget NotificationDelivery delivery, UUID leaseToken, Instant leaseUntil, int attempts);
    @Mapping(target = "leaseUntil", expression = "java(null)")
    @Mapping(target = "leaseToken", expression = "java(null)")
    void finish(@MappingTarget NotificationDelivery delivery, NotificationDeliveryStatus status, Instant completedAt,
            String lastError, Long messageId);
    @Mapping(target = "status", constant = "PENDING")
    @Mapping(target = "leaseUntil", expression = "java(null)")
    @Mapping(target = "leaseToken", expression = "java(null)")
    void retry(@MappingTarget NotificationDelivery delivery, Instant nextAttemptAt, String lastError);
    NotificationReminder reminder(UUID eventId, UUID occurrenceId, Instant expectedStartAt, int offsetMinutes,
            Instant dueAt, String dedupKey);
    void finishReminder(@MappingTarget NotificationReminder reminder, Instant finishedAt);
    TelegramBinding binding(UUID userId, Long telegramUserId, Long chatId, String username);
    TelegramLinkToken linkToken(UUID userId, String tokenHash, Instant expiresAt);
    void useToken(@MappingTarget TelegramLinkToken token, Instant usedAt);
    TelegramUpdateReceipt receipt(Long updateId);
    TelegramRateLimit rateLimit(String scope, Instant availableAt);
    void rateLimit(@MappingTarget TelegramRateLimit limit, Instant availableAt);
}
