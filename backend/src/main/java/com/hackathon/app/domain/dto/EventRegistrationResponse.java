package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.RegistrationStatus;
import io.swagger.v3.oas.annotations.media.Schema;

/** Заявка глазами организатора: кто, с каким сообщением и что решено. */
@Schema(description = "Заявка глазами организатора")
public record EventRegistrationResponse(
		@Schema(description = "id заявки — для approve и reject", requiredMode = REQUIRED) UUID id,
		@Schema(description = "Кто подал", requiredMode = REQUIRED) UserShortResponse participant,
		@Schema(description = "Статус", requiredMode = REQUIRED) RegistrationStatus status,
		@Schema(description = "Сообщение к заявке") String message,
		@Schema(description = "Причина решения") String decisionReason,
		@Schema(description = "Когда решено") Instant decidedAt,
		@Schema(requiredMode = REQUIRED) Instant createdAt,
		@Schema(description = "Когда встал в лист ожидания (порядок очереди); null — не в листе ожидания") Instant queuedAt) {
}
