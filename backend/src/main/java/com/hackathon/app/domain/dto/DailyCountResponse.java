package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Значение за день")
public record DailyCountResponse(
		@Schema(description = "День (по Красноярску)", example = "2026-10-10", requiredMode = REQUIRED) LocalDate date,
		@Schema(description = "Сколько за этот день", example = "12", requiredMode = REQUIRED) long count) {
}
