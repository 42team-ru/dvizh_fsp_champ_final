package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** Фото альбома: картинка, подпись, автор и мероприятие. */
@Schema(description = "Фото альбома")
public record AlbumPhotoResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Ссылка на картинку", example = "/api/files/…", requiredMode = REQUIRED) String url,
		@Schema(description = "Подпись") String caption,
		@Schema(description = "Когда добавлено", requiredMode = REQUIRED) Instant createdAt,
		@Schema(description = "Кто добавил", requiredMode = REQUIRED) UserShortResponse author,
		@Schema(description = "С какого мероприятия", requiredMode = REQUIRED) AlbumEventResponse event,
		@Schema(description = "Моё фото: можно подписать и удалить", requiredMode = REQUIRED) boolean mine) {
}
