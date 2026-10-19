package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.EventStatus;
import io.swagger.v3.oas.annotations.media.Schema;

/** Мероприятие, к которому относятся фото альбома: папка или вариант при загрузке. */
@Schema(description = "Занятие в альбоме")
public record AlbumEventResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Название", example = "Пробежка вокруг Татышева", requiredMode = REQUIRED) String title,
		@Schema(description = "Начало (у серии — первое занятие)", requiredMode = REQUIRED) Instant startAt,
		@Schema(description = "Статус мероприятия", requiredMode = REQUIRED) EventStatus status,
		@Schema(requiredMode = REQUIRED) SportResponse sport) {
}
