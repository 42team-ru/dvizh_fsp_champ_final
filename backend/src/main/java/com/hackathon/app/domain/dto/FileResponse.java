package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** Загруженный файл: url ведёт на GET /api/files/{id} (картинку можно ставить прямо в img src). */
@Schema(description = "Загруженный файл")
public record FileResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Адрес для скачивания и показа: /api/files/{id}", requiredMode = REQUIRED) String url,
		@Schema(description = "Имя файла, как его загрузили", requiredMode = REQUIRED) String name,
		@Schema(description = "MIME-тип", requiredMode = REQUIRED) String contentType,
		@Schema(description = "Размер в байтах", requiredMode = REQUIRED) long size,
		@Schema(description = "Точка фокуса для превью; null — центр") FocusPoint focus) {
}
