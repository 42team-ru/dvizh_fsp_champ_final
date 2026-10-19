package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.hackathon.app.domain.enums.QuorumStatus;
import io.swagger.v3.oas.annotations.media.Schema;

/** Кворум занятия: «состоится, если наберём required — пока count». */
@Schema(description = "Кворум занятия: состоится, если наберём required")
public record QuorumResponse(
		@Schema(description = "Сколько нужно, чтобы занятие состоялось", example = "6", requiredMode = REQUIRED) int required,
		@Schema(description = "Сколько уже придёт: отметки (у разового — подтверждённые записи)", example = "3",
				requiredMode = REQUIRED) long count,
		@Schema(description = "Собираем, набрали или организатор подтвердил", requiredMode = REQUIRED) QuorumStatus status,
		@Schema(description = "Состоится: набрали или подтвердил организатор", requiredMode = REQUIRED) boolean takesPlace) {
}
