package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** Мероприятие в альбоме: для группировки, фильтра и подписи к фото. */
@Schema(description = "Мероприятие в альбоме")
public record AlbumEventResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Название", requiredMode = REQUIRED) String title,
		@Schema(description = "Вид спорта", requiredMode = REQUIRED) SportResponse sport,
		@Schema(description = "Начало (у серии — первое занятие)", requiredMode = REQUIRED) Instant startAt,
		@Schema(description = "Сколько фото с этого мероприятия в альбоме; в списке доступных для загрузки — 0",
				requiredMode = REQUIRED) long photosCount) {
}
