package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** Фото альбома с занятия. */
@Schema(description = "Фото альбома")
public record AlbumPhotoResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Адрес картинки: /api/files/{id}", requiredMode = REQUIRED) String url,
		@Schema(description = "Подпись", example = "Финиш у моста") String caption,
		@Schema(description = "Когда загружено", requiredMode = REQUIRED) Instant createdAt,
		@Schema(description = "Моё фото: можно править подпись и удалить", requiredMode = REQUIRED) boolean mine,
		@Schema(requiredMode = REQUIRED) AlbumEventResponse event) {
}
