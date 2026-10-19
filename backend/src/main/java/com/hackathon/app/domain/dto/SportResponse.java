package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Вид спорта")
public record SportResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Название", example = "Футбол", requiredMode = REQUIRED) String name,
		@Schema(description = "Код для URL", example = "football", requiredMode = REQUIRED) String slug,
		@Schema(description = "Добавлен пользователем, а не из справочника", requiredMode = REQUIRED) boolean custom,
		@Schema(description = "Иллюстрация вида спорта; у видов без своей картинки — общая",
				example = "/api/sports/3f1c…/image", requiredMode = REQUIRED) String imageUrl) {
}
