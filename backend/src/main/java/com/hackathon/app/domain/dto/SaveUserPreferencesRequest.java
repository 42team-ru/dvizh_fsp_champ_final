package com.hackathon.app.domain.dto;

import java.time.DayOfWeek;
import java.util.List;

import com.hackathon.app.domain.enums.Daytime;
import com.hackathon.app.domain.enums.SportLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

/** Полная замена предпочтений онбординга. */
public record SaveUserPreferencesRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotNull SportLevel level,
        @Schema(description = "Удобные дни недели; хотя бы один", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotEmpty List<@NotNull DayOfWeek> days,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotNull Daytime daytime,
        @Schema(description = "Радиус поиска в километрах", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull @Min(1) @Max(20) Integer radiusKm,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotNull @Valid HelpersPreferences helpers) {
}
