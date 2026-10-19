package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.Map;

import io.swagger.v3.oas.annotations.media.Schema;

/** Образ бобра в формате docs/beaver-backend-integration.md: только коды из каталога, без картинок. */
@Schema(description = "Образ бобра: коды вещей из каталога. Без сохранённых настроек — {mood: idle, activity: none, outfit: {}}")
public record PetResponse(
		@Schema(description = "Настроение", example = "happy", requiredMode = REQUIRED) String mood,
		@Schema(description = "Инвентарь; none — без инвентаря", example = "hockey", requiredMode = REQUIRED) String activity,
		@Schema(description = "Надетое: код слота → код вещи. Пустой слот отсутствует в объекте",
				example = "{\"shirt\": \"hc-sokol\", \"hat\": \"helmet\", \"bottom\": \"hockeypants\"}", requiredMode = REQUIRED)
		Map<String, String> outfit) {
}
