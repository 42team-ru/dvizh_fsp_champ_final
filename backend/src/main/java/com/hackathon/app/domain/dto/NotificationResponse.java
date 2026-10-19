package com.hackathon.app.domain.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;
import java.time.Instant;
import java.util.UUID;
import com.hackathon.app.domain.enums.*;
/** Безопасное представление собственного уведомления. */
public record NotificationResponse(@Schema(requiredMode = REQUIRED) UUID id, UUID actorId, @Schema(requiredMode = REQUIRED) NotificationType type, @Schema(requiredMode = REQUIRED) NotificationCategory category,
        @Schema(requiredMode = REQUIRED) String title, @Schema(requiredMode = REQUIRED) String body, @Schema(requiredMode = REQUIRED) String targetPath, UUID eventId, UUID occurrenceId, UUID organizationId,
        @Schema(requiredMode = REQUIRED) Instant createdAt, Instant readAt, @Schema(requiredMode = REQUIRED) long revision,
        @Schema(description = "Кто вызвал уведомление (ответил, принял заявку); null — система") UserShortResponse actor) {}
