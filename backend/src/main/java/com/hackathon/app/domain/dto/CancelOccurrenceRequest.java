package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Отмена занятия серии")
public record CancelOccurrenceRequest(
		@Schema(description = "Причина; участники увидят её у занятия", example = "Зал закрыт на праздники",
				requiredMode = REQUIRED)
		@NotBlank @Size(max = 1000) String reason) {
}
