package com.hackathon.app.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.entity.Event;

/**
 * Карточка мероприятия. Открывается в любом статусе: снятое или удалённое показывается с причиной (moderationReason).
 * onlineUrl и privateDetails заполнены, только если viewer.canSeePrivateDetails. participants — подтверждённые участники.
 */
public record EventResponse(UUID id, String title, String description, SportResponse sport, UserShortResponse author,
		UUID organizationId, Instant startAt, Instant endAt, Event.Format format, String address, String locationNote,
		String onlineUrl, Double lat, Double lon, Event.Level level, Event.Kind kind, String requirements,
		String equipment, String privateDetails, Integer capacity, long participantsCount,
		List<UserShortResponse> participants, Event.JoinMode joinMode, Event.Status status, String moderationReason,
		Instant moderatedAt, ViewerResponse viewer, Instant createdAt, Instant updatedAt) {
}
