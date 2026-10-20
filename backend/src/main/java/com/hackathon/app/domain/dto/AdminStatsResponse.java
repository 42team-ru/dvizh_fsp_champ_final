package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Счётчики для дашборда админа")
public record AdminStatsResponse(
		@Schema(description = "Пользователей всего (люди и организации)", requiredMode = REQUIRED) long users,
		@Schema(description = "Заявок организаций ждут решения", requiredMode = REQUIRED) long organizationsPending,
		@Schema(description = "Одобренных организаций", requiredMode = REQUIRED) long organizationsApproved,
		@Schema(description = "Опубликованных мероприятий", requiredMode = REQUIRED) long eventsPublished,
		@Schema(description = "Снятых с публикации", requiredMode = REQUIRED) long eventsUnpublished,
		@Schema(description = "Удалённых", requiredMode = REQUIRED) long eventsDeleted,
		@Schema(description = "Подтверждённых записей", requiredMode = REQUIRED) long registrationsConfirmed,
		@Schema(description = "Заявок ждут решения организаторов", requiredMode = REQUIRED) long registrationsPending,
		@Schema(description = "Комментариев", requiredMode = REQUIRED) long comments,
		@Schema(description = "Текстов ждут решения модератора: сомнительные и скрытые автоматически", requiredMode = REQUIRED)
		long moderationQueue,
		@Schema(description = "Сколько присоединилось по дням (регистрации), старые дни сначала, дни без регистраций — с нулём",
				requiredMode = REQUIRED)
		List<DailyCountResponse> signupsByDay) {
}
