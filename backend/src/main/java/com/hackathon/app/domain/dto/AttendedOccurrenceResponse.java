package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** Прошедшее занятие в истории посещений. */
@Schema(description = "Прошедшее занятие, на котором человек был записан или отмечен")
public record AttendedOccurrenceResponse(
		@Schema(requiredMode = REQUIRED) UUID occurrenceId,
		@Schema(description = "Начало занятия", requiredMode = REQUIRED) Instant startAt,
		@Schema(description = "Окончание занятия") Instant endAt,
		@Schema(description = "Мероприятие; время в нём — ближайшего будущего занятия, для истории берите startAt выше",
				requiredMode = REQUIRED) EventSummaryResponse event) {
}
