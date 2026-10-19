package com.hackathon.app.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.entity.Event;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Карточка мероприятия. Открывается в любом статусе: снятое или удалённое показывается с причиной (moderationReason).
 */
@Schema(description = "Карточка мероприятия; открывается в любом статусе, снятое — с причиной")
public record EventResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Название", requiredMode = REQUIRED) String title,
		@Schema(description = "Описание") String description,
		@Schema(description = "Вид спорта", requiredMode = REQUIRED) SportResponse sport,
		@Schema(description = "Автор мероприятия", requiredMode = REQUIRED) UserShortResponse author,
		@Schema(description = "Все организаторы: автор первым, дальше соорганизаторы", requiredMode = REQUIRED)
		List<OrganizerResponse> organizers,
		@Schema(description = "Организация, от имени которой мероприятие; null — от частного лица") UUID organizationId,
		@Schema(description = "Начало", requiredMode = REQUIRED) Instant startAt,
		@Schema(description = "Окончание") Instant endAt,
		@Schema(description = "Очно или онлайн", requiredMode = REQUIRED) Event.Format format,
		@Schema(description = "Адрес") String address,
		@Schema(description = "Как найти место") String locationNote,
		@Schema(description = "Ссылка на онлайн-встречу; null, если viewer.canSeePrivateDetails = false") String onlineUrl,
		@Schema(description = "Широта") Double lat,
		@Schema(description = "Долгота") Double lon,
		@Schema(description = "Для какого уровня", requiredMode = REQUIRED) Event.Level level,
		@Schema(description = "Вид мероприятия") Event.Kind kind,
		@Schema(description = "Требования к участникам") String requirements,
		@Schema(description = "Что взять с собой") String equipment,
		@Schema(description = "Детали для участников; null, если viewer.canSeePrivateDetails = false") String privateDetails,
		@Schema(description = "Лимит мест; null — без лимита") Integer capacity,
		@Schema(description = "Подтверждённых участников", requiredMode = REQUIRED) long participantsCount,
		@Schema(description = "Подтверждённые участники", requiredMode = REQUIRED) List<UserShortResponse> participants,
		@Schema(description = "Режим записи", requiredMode = REQUIRED) Event.JoinMode joinMode,
		@Schema(description = "Статус мероприятия", requiredMode = REQUIRED) Event.Status status,
		@Schema(description = "Причина снятия с публикации или удаления") String moderationReason,
		@Schema(description = "Когда снято или удалено") Instant moderatedAt,
		@Schema(description = "Что могу делать я", requiredMode = REQUIRED) ViewerResponse viewer,
		@Schema(requiredMode = REQUIRED) Instant createdAt,
		@Schema(requiredMode = REQUIRED) Instant updatedAt) {
}
