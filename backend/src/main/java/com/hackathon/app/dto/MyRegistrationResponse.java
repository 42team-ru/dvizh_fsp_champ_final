package com.hackathon.app.dto;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.entity.Registration;

/** Моя запись вместе с мероприятием: event.status показывает, если его сняли с публикации или удалили. */
public record MyRegistrationResponse(UUID id, Registration.Status status, String message, String decisionReason,
		Instant decidedAt, Instant createdAt, EventSummaryResponse event) {
}
