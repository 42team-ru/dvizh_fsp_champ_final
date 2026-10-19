package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.hackathon.app.domain.enums.PetBodyPart;
import io.swagger.v3.oas.annotations.media.Schema;

/** Рисунок своей вещи: фронт вставляет его в слот части тела как <g transform="translate(x y) scale(scale)">svg</g>. */
@Schema(description = "Рисунок вещи, добавленной админом")
public record PetArtResponse(
		/** Часть тела, на которую надевается вещь. */
		@Schema(requiredMode = REQUIRED) PetBodyPart bodyPart,
		/** Разметка из одних <path>, рисунок начинается в (0, 0). */
		@Schema(description = "SVG-разметка из одних <path>", requiredMode = REQUIRED) String svg,
		/** Сдвиг по x в координатах рисунка бобра. */
		@Schema(description = "translate x в координатах рисунка бобра", example = "76.21", requiredMode = REQUIRED) double x,
		/** Сдвиг по y в координатах рисунка бобра. */
		@Schema(description = "translate y в координатах рисунка бобра", example = "-40", requiredMode = REQUIRED) double y,
		/** Масштаб рисунка. */
		@Schema(description = "Масштаб", example = "1.29", requiredMode = REQUIRED) double scale) {
}
