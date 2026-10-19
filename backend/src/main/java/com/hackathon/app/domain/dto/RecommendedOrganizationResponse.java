package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/** Клуб в подборке «Клубы для вас». */
@Schema(description = "Рекомендованная организация")
public record RecommendedOrganizationResponse(
		@Schema(requiredMode = REQUIRED) OrganizationShortResponse organization,
		@Schema(description = "Город") String city,
		@Schema(description = "Описание") String description,
		@Schema(description = "Логотип: /api/files/{id}; null — без логотипа") String logoUrl,
		@Schema(description = "Виды спорта клуба", requiredMode = REQUIRED) List<SportResponse> sports,
		@Schema(description = "Встреч в ближайшие 30 дней", requiredMode = REQUIRED) long upcomingEvents,
		@Schema(description = "Проведено встреч", requiredMode = REQUIRED) long hostedMeetings,
		@Schema(description = "До ближайшей очной встречи клуба, км; null — неизвестно") Double distanceKm,
		@Schema(description = "Оценка 0–1", requiredMode = REQUIRED) double score,
		@Schema(description = "1–3 главные причины", requiredMode = REQUIRED) List<RecommendationReason> reasons) {
}
