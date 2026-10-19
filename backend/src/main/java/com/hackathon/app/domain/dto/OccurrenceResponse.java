package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.OccurrenceSource;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import io.swagger.v3.oas.annotations.media.Schema;

/** Занятие мероприятия: время, статус, заполненность и мои права. */
@Schema(description = "Занятие мероприятия")
public record OccurrenceResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Мероприятие", requiredMode = REQUIRED) UUID eventId,
		@Schema(description = "Начало (после переноса — новое)", requiredMode = REQUIRED) Instant startAt,
		@Schema(description = "Окончание") Instant endAt,
		@Schema(description = "Перенесено: начало отличается от исходного по расписанию", requiredMode = REQUIRED)
		boolean rescheduled,
		@Schema(description = "Исходное начало по расписанию; null — не из правила") Instant originalStartAt,
		@Schema(description = "Откуда занятие: разовое мероприятие, правило или добавленная дата", requiredMode = REQUIRED)
		OccurrenceSource source,
		@Schema(description = "Состоится или отменено", requiredMode = REQUIRED) OccurrenceStatus status,
		@Schema(description = "Причина отмены") String cancelReason,
		@Schema(description = "Сколько придёт: отметки (у разового — подтверждённые записи)", requiredMode = REQUIRED)
		long attendeesCount,
		@Schema(description = "Лимит мест на занятие; null — без лимита") Integer capacity,
		@Schema(description = "Кворум занятия; null — у мероприятия кворума нет") QuorumResponse quorum,
		@Schema(description = "Когда организатор подтвердил, что занятие состоится") Instant confirmedAt,
		@Schema(description = "Что могу делать я", requiredMode = REQUIRED) OccurrenceViewerResponse viewer) {
}
