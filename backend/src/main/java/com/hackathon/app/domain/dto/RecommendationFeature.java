package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.hackathon.app.domain.enums.RecommendationFeatureCode;
import io.swagger.v3.oas.annotations.media.Schema;

/** Один признак в разборе оценки. */
@Schema(description = "Признак оценки: значение, вес и вклад")
public record RecommendationFeature(
		@Schema(requiredMode = REQUIRED) RecommendationFeatureCode code,
		@Schema(description = "Значение признака 0–1", requiredMode = REQUIRED) double value,
		@Schema(description = "Вес после перераспределения; 0 — признак выключен (нет данных)", requiredMode = REQUIRED)
		double weight,
		@Schema(description = "Вклад в оценку: value × weight", requiredMode = REQUIRED) double contribution) {
}
