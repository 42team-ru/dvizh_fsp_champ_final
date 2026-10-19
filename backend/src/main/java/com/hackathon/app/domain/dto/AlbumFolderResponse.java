package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/** Папка альбома: одно мероприятие и фото человека с него. */
@Schema(description = "Папка альбома = занятие")
public record AlbumFolderResponse(
		@Schema(requiredMode = REQUIRED) AlbumEventResponse event,
		@Schema(description = "Сколько фото в папке", example = "12", requiredMode = REQUIRED) long photoCount,
		@Schema(description = "Обложка — последнее загруженное фото: /api/files/{id}", requiredMode = REQUIRED) String coverUrl) {
}
