package com.hackathon.app.dto;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.entity.Registration;

/** Заявка глазами организатора: кто, с каким сообщением и что решено. */
public record EventRegistrationResponse(UUID id, ParticipantResponse participant, Registration.Status status,
		String message, Instant decidedAt, Instant createdAt) {
}
