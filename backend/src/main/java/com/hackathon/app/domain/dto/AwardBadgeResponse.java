package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.time.LocalDate;

import com.hackathon.app.domain.enums.OrganizationAwardKind;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Награда на публичной странице организации: полученная с датой или веха с прогрессом")
public record AwardBadgeResponse(
		@Schema(requiredMode = REQUIRED) OrganizationAwardKind kind,
		@Schema(description = "Название", example = "100 участников", requiredMode = REQUIRED) String title,
		@Schema(description = "Условие", requiredMode = REQUIRED) String description,
		@Schema(description = "Получена ли", requiredMode = REQUIRED) boolean earned,
		@Schema(description = "Когда получена; null — ещё нет") Instant earnedAt,
		@Schema(description = "Месяц награды «Организация месяца» (первый день); у вех null", example = "2026-09-01") LocalDate period,
		@Schema(description = "Прогресс вехи, не больше цели; у «Организации месяца» 0", example = "64", requiredMode = REQUIRED) int progress,
		@Schema(description = "Цель вехи; у «Организации месяца» 0", example = "100", requiredMode = REQUIRED) int goal,
		@Schema(description = "Иллюстрация награды", example = "/api/achievement-images/org_participants_100.webp", requiredMode = REQUIRED) String imageUrl) {
}
