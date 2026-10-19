package com.hackathon.app.dto;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.entity.Event;
import com.hackathon.app.entity.Registration;

/** participantsCount — подтверждённые участники; myRegistrationStatus — статус записи текущего пользователя или null. */
public record EventResponse(UUID id, String title, String description, SportResponse sport, UUID authorId,
		UUID organizationId, Instant startAt, Instant endAt, boolean offlineMode, String address, String locationNote,
		Double latitude, Double longitude, Event.Level level, Event.Format format, String requirements,
		String equipment, Integer capacity, Event.JoinMode joinMode, Event.Status status, String moderationReason,
		long participantsCount, Registration.Status myRegistrationStatus, Instant createdAt, Instant updatedAt) {
}
