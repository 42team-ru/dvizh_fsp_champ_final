package com.hackathon.app.dto;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.entity.Registration;

public record RegistrationResponse(UUID id, UUID eventId, UUID userId, Registration.Status status, String message,
		String decisionReason, Instant decidedAt, UUID decidedById, Instant createdAt) {
}
