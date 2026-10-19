package com.hackathon.app.domain.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** Настройки помощников; пока сохраняются без запуска уведомлений или реакций. */
public record HelpersPreferences(
        @Schema(description = "Напоминать о тренировках", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull Boolean reminders,
        @Schema(description = "Подсказывать события рядом", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull Boolean nearby,
        @Schema(description = "Радоваться достижениям", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull Boolean cheer) {
}
