package com.hackathon.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Настройки подбора мероприятий и клубов (формулы — в docs/recommendations.md). Веса не обязаны давать в сумме 1:
 * оценка делится на сумму весов включённых признаков.
 */
@ConfigurationProperties("app.recommendations")
public record RecommendationProperties(
		/* Период полураспада сигналов истории, дней: запись полуторамесячной давности весит вдвое меньше свежей. */
		@DefaultValue("45") double halfLifeDays,
		/* Горизонт подборки, дней вперёд. */
		@DefaultValue("30") int horizonDays,
		/* Не советовать то, что начнётся раньше чем через столько минут: не успеть. */
		@DefaultValue("30") int minLeadMinutes,
		/* Сколько кандидатов оценивать за запрос. */
		@DefaultValue("500") int maxCandidates,
		/* Радиус по умолчанию, км, если его нет ни в запросе, ни в предпочтениях. */
		@DefaultValue("10") int defaultRadiusKm,
		/* Очные дальше radius × это число не советуем совсем. */
		@DefaultValue("3") double maxDistanceFactor,
		/* MMR: 1 — только оценка, 0 — только непохожесть на уже выбранное. */
		@DefaultValue("0.75") double mmrLambda,
		/* Каждая N-я позиция — слот «Попробуйте новое»; 0 — без слотов. */
		@DefaultValue("5") int discoveryEvery,
		@DefaultValue Weights weights) {

	/** Веса признаков мероприятия. */
	public record Weights(
			@DefaultValue("0.30") double sport,
			@DefaultValue("0.15") double distance,
			@DefaultValue("0.12") double level,
			@DefaultValue("0.12") double time,
			@DefaultValue("0.08") double social,
			@DefaultValue("0.08") double organizer,
			@DefaultValue("0.05") double trust,
			@DefaultValue("0.04") double popularity,
			@DefaultValue("0.03") double quorum,
			@DefaultValue("0.03") double urgency) {
	}

	public RecommendationProperties {
		if (halfLifeDays <= 0 || horizonDays < 1 || maxCandidates < 1 || defaultRadiusKm < 1 || maxDistanceFactor < 1
				|| mmrLambda < 0 || mmrLambda > 1 || discoveryEvery < 0) {
			throw new IllegalArgumentException("Некорректные настройки рекомендаций");
		}
	}
}
