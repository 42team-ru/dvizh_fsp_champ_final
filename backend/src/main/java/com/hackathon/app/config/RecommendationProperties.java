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
		@DefaultValue Weights weights,
		@DefaultValue Scoring scoring,
		@DefaultValue Dismiss dismiss) {

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

	/** Константы оценки мероприятия (раньше были зашиты в EventScorer). */
	public record Scoring(
			/* Причина попадает в ответ, если её признак дал хотя бы столько итоговой оценки. */
			@DefaultValue("0.03") double reasonThreshold,
			/* Сколько причин показывать на карточке. */
			@DefaultValue("3") int maxReasons,
			/* Доля интереса, которую даёт похожий вид спорта. */
			@DefaultValue("0.6") double relatedSportShare,
			/* Доля лояльности, которую даёт похожий организатор. */
			@DefaultValue("0.5") double relatedOrganizerShare,
			/* Признак расстояния для онлайна при известной точке: не рядом, но и не далеко. */
			@DefaultValue("0.6") double onlineDistanceValue,
			/* Множитель, если уровень совсем не подходит (новичку — профи). */
			@DefaultValue("0.3") double levelGate,
			/* Привычки по времени учитываются, если посещений хотя бы столько. */
			@DefaultValue("3") int minHabit) {
	}

	/**
	 * «Не интересно»: само событие из подборки уходит, а похожие на него опускаются ниже — множитель
	 * max(floor, sportFactor^k · Π(1 − similarStrength · sim · decay)). Пол floor не даёт похожим пропасть совсем.
	 */
	public record Dismiss(
			/* «Не мой вид спорта»: множитель за каждое (затухающее) скрытие этого вида. */
			@DefaultValue("0.5") double sportFactor,
			/* Насколько сильно похожее на скрытое опускается: 1 — до пола при полной похожести. */
			@DefaultValue("0.6") double similarStrength,
			/* Ниже этого множителя не опускаем: похожие встречи остаются в подборке, только ниже. */
			@DefaultValue("0.35") double floor,
			/* Похожесть ниже порога не штрафуем: «скрыл футбол» не трогает шахматы. */
			@DefaultValue("0.3") double minSimilarity,
			/* Места ближе этого, км, считаются «тем же местом». */
			@DefaultValue("3") double nearKm,
			@DefaultValue Similarity similarity) {
	}

	/** Веса похожести на скрытое событие; нормируются на сумму. */
	public record Similarity(
			@DefaultValue("0.45") double sport,
			@DefaultValue("0.25") double organizer,
			@DefaultValue("0.15") double time,
			@DefaultValue("0.15") double place) {
	}

	public RecommendationProperties {
		if (halfLifeDays <= 0 || horizonDays < 1 || maxCandidates < 1 || defaultRadiusKm < 1 || maxDistanceFactor < 1
				|| mmrLambda < 0 || mmrLambda > 1 || discoveryEvery < 0) {
			throw new IllegalArgumentException("Некорректные настройки рекомендаций");
		}
		if (dismiss != null && (dismiss.floor() <= 0 || dismiss.floor() > 1 || dismiss.similarStrength() < 0
				|| dismiss.sportFactor() <= 0 || dismiss.sportFactor() > 1)) {
			throw new IllegalArgumentException("Некорректные настройки «Не интересно»: floor в (0, 1], sportFactor в (0, 1]");
		}
	}
}
