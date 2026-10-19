package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.EventStatus;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Мероприятие в админке: статус модерации и кто автор")
public record AdminEventResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Название", requiredMode = REQUIRED) String title,
		@Schema(description = "Вид спорта", requiredMode = REQUIRED) SportResponse sport,
		@Schema(description = "Начало", requiredMode = REQUIRED) Instant startAt,
		@Schema(description = "Адрес") String address,
		@Schema(description = "Автор", requiredMode = REQUIRED) UserShortResponse author,
		@Schema(description = "Организация; null — от частного лица") UUID organizationId,
		@Schema(description = "Подтверждённых участников", requiredMode = REQUIRED) long participantsCount,
		@Schema(description = "Статус", requiredMode = REQUIRED) EventStatus status,
		@Schema(description = "Причина снятия или удаления") String moderationReason,
		@Schema(description = "Когда снято или удалено") Instant moderatedAt,
		@Schema(requiredMode = REQUIRED) Instant createdAt) {
}
