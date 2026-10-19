package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.JoinMode;
import com.hackathon.app.domain.enums.RegistrationStatus;
import io.swagger.v3.oas.annotations.media.Schema;

/** Данные точки для маркера и короткой карточки по клику; полная карточка — events_get. */
@Schema(description = "Свойства точки на карте: хватает на маркер и короткую карточку")
public record EventMapProperties(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Название", requiredMode = REQUIRED) String title,
		@Schema(description = "Вид спорта", requiredMode = REQUIRED) SportResponse sport,
		@Schema(description = "Начало; у серии — ближайшего занятия в периоде", requiredMode = REQUIRED) Instant startAt,
		@Schema(description = "Окончание; у серии — ближайшего занятия в периоде") Instant endAt,
		@Schema(description = "Занятие, к которому относятся startAt и endAt") UUID occurrenceId,
		@Schema(description = "Повторяющееся мероприятие (серия занятий)", requiredMode = REQUIRED) boolean recurring,
		@Schema(description = "Расписание словами; null — разовое") String scheduleDescription,
		@Schema(description = "Адрес") String address,
		@Schema(description = "Для какого уровня", requiredMode = REQUIRED) EventLevel level,
		@Schema(description = "Режим записи", requiredMode = REQUIRED) JoinMode joinMode,
		@Schema(description = "Подтверждённых участников", requiredMode = REQUIRED) long participantsCount,
		@Schema(description = "Лимит мест; null — без лимита") Integer capacity,
		@Schema(description = "Статус моей записи; null — не записан") RegistrationStatus myRegistrationStatus) {
}
