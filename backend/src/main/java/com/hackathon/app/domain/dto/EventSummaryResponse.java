package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventKind;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.JoinMode;
import com.hackathon.app.domain.enums.QuorumStatus;
import com.hackathon.app.domain.enums.RegistrationStatus;
import io.swagger.v3.oas.annotations.media.Schema;

/** Мероприятие в списке (лента, мои события, мои записи): без приватных деталей. */
@Schema(description = "Мероприятие в списке: лента, мои мероприятия, мои записи")
public record EventSummaryResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Название", requiredMode = REQUIRED) String title,
		@Schema(description = "Вид спорта", requiredMode = REQUIRED) SportResponse sport,
		@Schema(description = "Начало; у серии — ближайшего подходящего занятия", requiredMode = REQUIRED) Instant startAt,
		@Schema(description = "Окончание; у серии — ближайшего подходящего занятия") Instant endAt,
		@Schema(description = "Занятие, к которому относятся startAt и endAt; null — подходящих нет") UUID occurrenceId,
		@Schema(description = "Повторяющееся мероприятие (серия занятий)", requiredMode = REQUIRED) boolean recurring,
		@Schema(description = "Расписание словами; null — разовое", example = "по вторникам в 20:00")
		String scheduleDescription,
		@Schema(description = "Очно или онлайн", requiredMode = REQUIRED) EventFormat format,
		@Schema(description = "Адрес") String address,
		@Schema(description = "Как найти место") String locationNote,
		@Schema(description = "Широта; у онлайн-мероприятия null") Double lat,
		@Schema(description = "Долгота; у онлайн-мероприятия null") Double lon,
		@Schema(description = "Для какого уровня", requiredMode = REQUIRED) EventLevel level,
		@Schema(description = "Вид мероприятия") EventKind kind,
		@Schema(description = "Режим записи", requiredMode = REQUIRED) JoinMode joinMode,
		@Schema(description = "Лимит мест; null — без лимита. У серии — на каждое занятие") Integer capacity,
		@Schema(description = "Подтверждённых участников («записались 8 из 16»); у серии — принятых в серию",
				requiredMode = REQUIRED) long participantsCount,
		@Schema(description = "У серии — сколько отметились на занятие occurrenceId («придут 7 из 10»); у разового — null")
		Long occurrenceAttendeesCount,
		@Schema(description = "Кворум: состоится, если наберём столько; null — без кворума") Integer minParticipants,
		@Schema(description = "Кворум ближайшего подходящего занятия; null — без кворума или занятия нет")
		QuorumStatus quorumStatus,
		@Schema(description = "Разовое мероприятие отменено организатором (у серии отменяются отдельные занятия)",
				requiredMode = REQUIRED) boolean cancelledByOrganizer,
		@Schema(description = "Статус мероприятия", requiredMode = REQUIRED) EventStatus status,
		@Schema(description = "Причина снятия с публикации или удаления") String moderationReason,
		@Schema(description = "Организатор-человек", requiredMode = REQUIRED) UUID authorId,
		@Schema(description = "Организация; null — от частного лица") UUID organizationId,
		@Schema(description = "Кто организует: автор мероприятия (у события организации — её аккаунт)", requiredMode = REQUIRED)
		UserShortResponse organizer,
		@Schema(description = "Организация для подписи «Шахматный клуб «Ладья»»; null — от частного лица")
		OrganizationShortResponse organization,
		@Schema(description = "Статус моей записи; null — не записан") RegistrationStatus myRegistrationStatus,
		@Schema(description = "Обложка (первое фото): /api/files/{id}; null — без фото") String coverUrl) {
}
