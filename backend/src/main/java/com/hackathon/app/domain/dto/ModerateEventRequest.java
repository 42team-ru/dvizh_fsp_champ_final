package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Снятие с публикации или удаление мероприятия админом")
public record ModerateEventRequest(
		@Schema(description = "Причина: её увидят записавшиеся и организатор", example = "Нарушает правила площадки",
				requiredMode = REQUIRED)
		@NotBlank @Size(max = 1000) String reason) {
}
