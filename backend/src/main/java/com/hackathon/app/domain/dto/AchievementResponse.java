package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;

import com.hackathon.app.domain.enums.AchievementCode;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Достижение с прогрессом")
public record AchievementResponse(
		@Schema(requiredMode = REQUIRED) AchievementCode code,
		@Schema(description = "Название", example = "Завсегдатай", requiredMode = REQUIRED) String title,
		@Schema(description = "Условие", example = "Сходить на 10 встреч", requiredMode = REQUIRED) String description,
		@Schema(description = "Текущий прогресс, не больше цели", example = "2", requiredMode = REQUIRED) int progress,
		@Schema(description = "Цель", example = "3", requiredMode = REQUIRED) int goal,
		@Schema(description = "Единица прогресса: «2 из 3 видов спорта»", example = "видов спорта", requiredMode = REQUIRED) String unit,
		@Schema(description = "Награда словами", example = "+50 монет", requiredMode = REQUIRED) String reward,
		@Schema(description = "Когда получено; null — ещё нет") Instant earnedAt,
		@Schema(description = "Иллюстрация достижения", example = "/api/achievement-images/first_step.webp", requiredMode = REQUIRED) String imageUrl) {
}
