package com.hackathon.app.domain.dto;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.format.annotation.DateTimeFormat;

/** Параметры персональной подборки мероприятий, все необязательные. */
@Schema(description = "Параметры подборки мероприятий")
public record RecommendationFilter(
		@Schema(description = "Текущее место: широта (вместе с lon); иначе — домашняя точка из предпочтений", example = "56.0153")
		@DecimalMin("-90") @DecimalMax("90") Double lat,
		@Schema(description = "Текущее место: долгота (вместе с lat)", example = "92.8932")
		@DecimalMin("-180") @DecimalMax("180") Double lon,
		@Schema(description = "Радиус в км, 1–100; по умолчанию из предпочтений", example = "5")
		@Min(1) @Max(100) Integer radiusKm,
		@Schema(description = "Только этот вид спорта")
		UUID sportId,
		@Schema(description = "Начало не раньше; по умолчанию — через 30 минут от текущего момента")
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
		@Schema(description = "Начало не позже; по умолчанию — 30 дней вперёд")
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
		@Schema(description = "Страница с нуля", example = "0")
		@Min(0) Integer page,
		@Schema(description = "Размер страницы 1–50; по умолчанию 20", example = "20")
		@Min(1) @Max(50) Integer size) {
}
