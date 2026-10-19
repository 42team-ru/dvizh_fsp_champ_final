package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

/** Точка фокуса картинки в процентах: превью обрезаются так, чтобы она осталась в кадре (CSS object-position). */
@Schema(description = "Точка фокуса: проценты от левого и верхнего края")
public record FocusPoint(
		@Schema(description = "По горизонтали, 0–100", example = "50", requiredMode = REQUIRED)
		@DecimalMin("0") @DecimalMax("100") double x,
		@Schema(description = "По вертикали, 0–100", example = "20", requiredMode = REQUIRED)
		@DecimalMin("0") @DecimalMax("100") double y) {
}
