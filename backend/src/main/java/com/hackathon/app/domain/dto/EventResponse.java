package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventKind;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.JoinMode;
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
		@Schema(description = "Организация для ссылки на её страницу; null — от частного лица") OrganizationShortResponse organization,
		@Schema(description = "Начало; у серии — первого занятия (ближайшее — в nextOccurrence)", requiredMode = REQUIRED)
		Instant startAt,
		@Schema(description = "Окончание; у серии — первого занятия") Instant endAt,
		@Schema(description = "Повторяющееся мероприятие (серия занятий)", requiredMode = REQUIRED) boolean recurring,
		@Schema(description = "Расписание серии; null — разовое") ScheduleResponse schedule,
		@Schema(description = "Ближайшее будущее занятие, которое состоится; null — таких нет. Все занятия — occurrences_list")
		OccurrenceShortResponse nextOccurrence,
		@Schema(description = "Очно или онлайн", requiredMode = REQUIRED) EventFormat format,
		@Schema(description = "Адрес") String address,
		@Schema(description = "Как найти место") String locationNote,
		@Schema(description = "Ссылка на онлайн-встречу; null, если viewer.canSeePrivateDetails = false") String onlineUrl,
		@Schema(description = "Широта") Double lat,
		@Schema(description = "Долгота") Double lon,
		@Schema(description = "Для какого уровня", requiredMode = REQUIRED) EventLevel level,
		@Schema(description = "Вид мероприятия") EventKind kind,
		@Schema(description = "Требования к участникам") String requirements,
		@Schema(description = "Что взять с собой") String equipment,
		@Schema(description = "Детали для участников; null, если viewer.canSeePrivateDetails = false") String privateDetails,
		@Schema(description = "Лимит мест; null — без лимита. У серии — на каждое занятие") Integer capacity,
		@Schema(description = "Кворум: состоится, если наберём столько; null — без кворума. У серии — на каждое занятие")
		Integer minParticipants,
		@Schema(description = "Занятие разового мероприятия: статус (отменено организатором — с причиной), кворум и кнопки; "
				+ "у серии — null, её занятия — occurrences_list")
		OccurrenceResponse singleOccurrence,
		@Schema(description = "Подтверждённых участников (у серии — принятых в серию)", requiredMode = REQUIRED)
		long participantsCount,
		@Schema(description = "Подтверждённые участники (у серии — принятые в серию)", requiredMode = REQUIRED)
		List<UserShortResponse> participants,
		@Schema(description = "Режим записи", requiredMode = REQUIRED) JoinMode joinMode,
		@Schema(description = "Статус мероприятия", requiredMode = REQUIRED) EventStatus status,
		@Schema(description = "Причина снятия с публикации или удаления") String moderationReason,
		@Schema(description = "Когда снято или удалено") Instant moderatedAt,
		@Schema(description = "Фото по порядку, первое — обложка; до 6", requiredMode = REQUIRED) List<FileResponse> photos,
		@Schema(description = "Что могу делать я", requiredMode = REQUIRED) ViewerResponse viewer,
		@Schema(requiredMode = REQUIRED) Instant createdAt,
		@Schema(requiredMode = REQUIRED) Instant updatedAt) {
}
