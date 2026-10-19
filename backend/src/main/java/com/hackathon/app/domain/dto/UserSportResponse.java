package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.hackathon.app.domain.enums.SportLevel;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Вид спорта в профиле и уровень в нём")
public record UserSportResponse(
		@Schema(requiredMode = REQUIRED) SportResponse sport,
		@Schema(description = "Уровень; null — не указан") SportLevel level) {
}
