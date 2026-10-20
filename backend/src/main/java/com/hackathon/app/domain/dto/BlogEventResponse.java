package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.EventStatus;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Встреча, о которой пост: плашка «Написано после встречи»")
public record BlogEventResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Название", example = "Пробежка вокруг Татышева", requiredMode = REQUIRED) String title,
		@Schema(description = "Начало (у серии — первое занятие)", requiredMode = REQUIRED) Instant startAt,
		@Schema(description = "Статус мероприятия", requiredMode = REQUIRED) EventStatus status,
		@Schema(requiredMode = REQUIRED) SportResponse sport,
		@Schema(description = "Кто организует (у события организации — её аккаунт)", requiredMode = REQUIRED) UserShortResponse organizer,
		@Schema(description = "Организация; null — от частного лица") OrganizationShortResponse organization,
		@Schema(description = "Обложка встречи: /api/files/{id}; null — без фото") String coverUrl) {
}
