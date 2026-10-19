package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/** Домашняя точка («мой район»): от неё рекомендации считают расстояние, если браузер не дал геолокацию. */
@Schema(description = "Домашняя точка для подбора «рядом с домом»")
public record HomePoint(
		@Schema(description = "Широта", example = "56.0153", requiredMode = REQUIRED)
		@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
		@Schema(description = "Долгота", example = "92.8932", requiredMode = REQUIRED)
		@NotNull @DecimalMin("-180") @DecimalMax("180") Double lon) {
}
