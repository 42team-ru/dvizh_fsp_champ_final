package com.hackathon.app.domain.dto;

import java.time.DayOfWeek;
import java.util.List;

import com.hackathon.app.domain.enums.Daytime;
import com.hackathon.app.domain.enums.SportLevel;
import io.swagger.v3.oas.annotations.media.Schema;

/** Собственные предпочтения; дни упорядочены с понедельника по воскресенье. */
public record UserPreferencesResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) SportLevel level,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<DayOfWeek> days,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Daytime daytime,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "1", maximum = "20") int radiusKm,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) HelpersPreferences helpers) {
}
