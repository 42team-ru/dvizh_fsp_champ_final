package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Фото в посте")
public record BlogPhotoResponse(
		@Schema(description = "Файл (id)", requiredMode = REQUIRED) UUID id,
		@Schema(description = "Адрес картинки: /api/files/{id}", requiredMode = REQUIRED) String url,
		@Schema(description = "Подпись") String caption,
		@Schema(description = "Точка фокуса для превью; null — центр") FocusPoint focus) {
}
