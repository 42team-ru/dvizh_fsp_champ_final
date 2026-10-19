package com.hackathon.app.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.entity.Registration;
import io.swagger.v3.oas.annotations.media.Schema;

/** Моя запись вместе с мероприятием: event.status показывает, если его сняли с публикации или удалили. */
@Schema(description = "Моя запись вместе с мероприятием")
public record MyRegistrationResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Статус записи", requiredMode = REQUIRED) Registration.Status status,
		@Schema(description = "Моё сообщение к заявке") String message,
		@Schema(description = "Причина решения организатора, например отказа") String decisionReason,
		@Schema(description = "Когда решено") Instant decidedAt,
		@Schema(requiredMode = REQUIRED) Instant createdAt,
		@Schema(description = "Мероприятие; event.status — снято ли оно с публикации", requiredMode = REQUIRED)
		EventSummaryResponse event) {
}
