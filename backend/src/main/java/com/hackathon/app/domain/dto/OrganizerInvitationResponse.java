package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** Приглашение в соорганизаторы, которое ждёт моего ответа. */
@Schema(description = "Приглашение в соорганизаторы, которое ждёт моего ответа")
public record OrganizerInvitationResponse(
		@Schema(description = "Мероприятие", requiredMode = REQUIRED) UUID eventId,
		@Schema(description = "Название мероприятия", requiredMode = REQUIRED) String eventTitle,
		@Schema(description = "Кто пригласил (автор мероприятия)", requiredMode = REQUIRED) UserShortResponse invitedBy,
		@Schema(description = "Когда пригласили", requiredMode = REQUIRED) Instant invitedAt) {
}
