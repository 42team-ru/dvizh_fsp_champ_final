package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Сколько посещений в виде спорта")
public record SportAttendanceResponse(
		@Schema(requiredMode = REQUIRED) SportResponse sport,
		@Schema(description = "Посещений", example = "12", requiredMode = REQUIRED) long count) {
}
