package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventKind;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.JoinMode;
import com.hackathon.app.domain.enums.RegistrationStatus;
import io.swagger.v3.oas.annotations.media.Schema;

/** Мероприятие в списке (лента, мои события, мои записи): без приватных деталей. */
@Schema(description = "Мероприятие в списке: лента, мои мероприятия, мои записи")
public record EventSummaryResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Название", requiredMode = REQUIRED) String title,
		@Schema(description = "Вид спорта", requiredMode = REQUIRED) SportResponse sport,
		@Schema(description = "Начало", requiredMode = REQUIRED) Instant startAt,
		@Schema(description = "Окончание") Instant endAt,
		@Schema(description = "Очно или онлайн", requiredMode = REQUIRED) EventFormat format,
		@Schema(description = "Адрес") String address,
		@Schema(description = "Как найти место") String locationNote,
		@Schema(description = "Для какого уровня", requiredMode = REQUIRED) EventLevel level,
		@Schema(description = "Вид мероприятия") EventKind kind,
		@Schema(description = "Режим записи", requiredMode = REQUIRED) JoinMode joinMode,
		@Schema(description = "Лимит мест; null — без лимита") Integer capacity,
		@Schema(description = "Подтверждённых участников («записались 8 из 16»)", requiredMode = REQUIRED) long participantsCount,
		@Schema(description = "Статус мероприятия", requiredMode = REQUIRED) EventStatus status,
		@Schema(description = "Причина снятия с публикации или удаления") String moderationReason,
		@Schema(description = "Организатор-человек", requiredMode = REQUIRED) UUID authorId,
		@Schema(description = "Организация; null — от частного лица") UUID organizationId,
		@Schema(description = "Статус моей записи; null — не записан") RegistrationStatus myRegistrationStatus) {
}
