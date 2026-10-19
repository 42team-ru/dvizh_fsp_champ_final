package com.hackathon.app.dto;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.entity.Event;
import com.hackathon.app.entity.Registration;

/** Мероприятие в списке (лента, мои события, мои записи): без приватных деталей; myRegistrationStatus — моя запись или null. */
public record EventSummaryResponse(UUID id, String title, SportResponse sport, Instant startAt, Instant endAt,
		Event.Format format, String address, String locationNote, Event.Level level, Event.Kind kind,
		Event.JoinMode joinMode, Integer capacity, long participantsCount, Event.Status status, String moderationReason,
		UUID authorId, UUID organizationId, Registration.Status myRegistrationStatus) {
}
