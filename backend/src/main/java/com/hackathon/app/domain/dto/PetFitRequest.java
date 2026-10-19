package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/** Ручная посадка вещи: translate(x y) scale(scale) в координатах рисунка бобра (бобр ≈ x 15…425, y 0…530). */
@Schema(description = "Посадка вещи на бобра")
public record PetFitRequest(
		/** Сдвиг по x. */
		@Schema(example = "76.21", requiredMode = REQUIRED) @NotNull @DecimalMin("-500") @DecimalMax("1000") Double x,
		/** Сдвиг по y. */
		@Schema(example = "-40", requiredMode = REQUIRED) @NotNull @DecimalMin("-500") @DecimalMax("1000") Double y,
		/** Масштаб. */
		@Schema(example = "1.29", requiredMode = REQUIRED) @NotNull @DecimalMin("0.01") @DecimalMax("20") Double scale) {
}
