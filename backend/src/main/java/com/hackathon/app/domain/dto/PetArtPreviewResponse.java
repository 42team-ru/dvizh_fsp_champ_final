package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/** Результат разбора картинки без сохранения: админ смотрит посадку и при необходимости правит x, y, scale. */
@Schema(description = "Разобранная картинка и рассчитанная посадка")
public record PetArtPreviewResponse(
		/** Рисунок и посадка. */
		@Schema(requiredMode = REQUIRED) PetArtResponse art,
		/** Ширина рисунка до масштабирования. */
		@Schema(description = "Ширина рисунка до масштаба", requiredMode = REQUIRED) double width,
		/** Высота рисунка до масштабирования. */
		@Schema(description = "Высота рисунка до масштаба", requiredMode = REQUIRED) double height,
		/** Число контуров после векторизации. */
		@Schema(description = "Сколько контуров получилось", requiredMode = REQUIRED) int paths) {
}
