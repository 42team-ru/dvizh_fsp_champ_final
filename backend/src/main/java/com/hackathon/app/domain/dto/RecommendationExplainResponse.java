package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** Разбор оценки одного мероприятия для меня: из чего она сложилась. */
@Schema(description = "Разбор оценки рекомендации по признакам")
public record RecommendationExplainResponse(
		@Schema(requiredMode = REQUIRED) UUID eventId,
		@Schema(description = "Итоговая оценка 0–1", requiredMode = REQUIRED) double score,
		@Schema(description = "Взвешенная сумма признаков до множителей", requiredMode = REQUIRED) double baseScore,
		@Schema(description = "Множитель за сильно неподходящий уровень (1 — нет штрафа)", requiredMode = REQUIRED)
		double levelGate,
		@Schema(description = "Множитель за скрытия этого вида спорта (1 — нет штрафа)", requiredMode = REQUIRED)
		double dismissPenalty,
		@Schema(description = "Попадёт ли в подборку", requiredMode = REQUIRED) boolean eligible,
		@Schema(description = "Почему не попадёт; null — попадёт", example = "Вы уже записаны") String excludedReason,
		@Schema(description = "Расстояние в км; null — онлайн или точка отсчёта неизвестна") Double distanceKm,
		@Schema(description = "Все признаки", requiredMode = REQUIRED) List<RecommendationFeature> features,
		@Schema(description = "Главные причины", requiredMode = REQUIRED) List<RecommendationReason> reasons) {
}
