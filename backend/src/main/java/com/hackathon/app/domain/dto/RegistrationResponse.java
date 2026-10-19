package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.RegistrationStatus;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Запись на мероприятие после действия (записаться, отменить, принять, отклонить)")
public record RegistrationResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Мероприятие", requiredMode = REQUIRED) UUID eventId,
		@Schema(description = "Участник", requiredMode = REQUIRED) UUID userId,
		@Schema(description = "Статус записи", requiredMode = REQUIRED) RegistrationStatus status,
		@Schema(description = "Сообщение к заявке") String message,
		@Schema(description = "Причина решения организатора") String decisionReason,
		@Schema(description = "Когда решено; null — ещё нет") Instant decidedAt,
		@Schema(description = "Кто решил; null — автоматически при свободной записи") UUID decidedById,
		@Schema(requiredMode = REQUIRED) Instant createdAt) {
}
