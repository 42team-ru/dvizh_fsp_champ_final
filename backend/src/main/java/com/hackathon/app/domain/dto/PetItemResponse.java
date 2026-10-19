package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Вещь бобра в каталоге")
public record PetItemResponse(
		/** Стабильный код вещи. */
		@Schema(description = "Код вещи — его передают в образе", example = "hc-sokol", requiredMode = REQUIRED) String id,
		/** Подпись для конструктора. */
		@Schema(description = "Подпись", example = "Хоккейная форма — Сокол (Красноярск)", requiredMode = REQUIRED) String label,
		/** Встроенное изображение фронтенда. */
		@Schema(description = "Встроенная (рисует фронт)", requiredMode = REQUIRED) boolean builtIn) {
}
