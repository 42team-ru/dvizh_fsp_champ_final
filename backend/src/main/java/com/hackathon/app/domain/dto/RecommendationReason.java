package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.hackathon.app.domain.enums.RecommendationReasonCode;
import io.swagger.v3.oas.annotations.media.Schema;

/** Почему это в подборке: код для иконки и готовый текст для человека. */
@Schema(description = "Причина рекомендации")
public record RecommendationReason(
		@Schema(requiredMode = REQUIRED) RecommendationReasonCode code,
		@Schema(description = "Текст для показа как есть", example = "1,2 км от дома", requiredMode = REQUIRED) String text) {
}
