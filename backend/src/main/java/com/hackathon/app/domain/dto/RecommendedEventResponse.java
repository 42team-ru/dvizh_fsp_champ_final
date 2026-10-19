package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/** Мероприятие в персональной подборке: та же карточка, что в ленте, плюс оценка и причины. */
@Schema(description = "Мероприятие в персональной подборке")
public record RecommendedEventResponse(
		@Schema(description = "Карточка как в ленте", requiredMode = REQUIRED) EventSummaryResponse event,
		@Schema(description = "Оценка 0–1, чем больше, тем лучше подходит", example = "0.82", requiredMode = REQUIRED)
		double score,
		@Schema(description = "Расстояние до места в км; null — онлайн или точка отсчёта неизвестна", example = "1.2")
		Double distanceKm,
		@Schema(description = "1–3 главные причины, самая весомая первой", requiredMode = REQUIRED)
		List<RecommendationReason> reasons,
		@Schema(description = "Слот «Попробуйте новое»: вид спорта вне моих интересов", requiredMode = REQUIRED)
		boolean discovery) {
}
