package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Занятие коротко: когда")
public record OccurrenceShortResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Начало", requiredMode = REQUIRED) Instant startAt,
		@Schema(description = "Окончание") Instant endAt) {
}
