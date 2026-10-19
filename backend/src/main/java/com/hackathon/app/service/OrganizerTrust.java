package com.hackathon.app.service;

import java.util.UUID;

import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.RegistrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Счётчики доверия к организатору: «провёл N встреч, пришли M человек». Помогают сделать первый шаг в незнакомую
 * компанию. Посещение не подтверждается (см. AttendanceHistoryService): считаем прошедшие неотменённые занятия
 * и подтверждённые записи.
 */
@Component
@RequiredArgsConstructor
public class OrganizerTrust {

	private final EventOccurrenceRepository occurrences;
	private final RegistrationRepository registrations;
	private final DbTimeRepository dbTime;

	/** Человек как автор мероприятий. */
	public Stats ofPerson(UUID userId) {
		var now = dbTime.now();
		return new Stats(occurrences.countHosted(userId, null, now), registrations.countHostedParticipants(userId, null, now));
	}

	/** Организация: её мероприятия. */
	public Stats ofOrganization(UUID organizationId) {
		var now = dbTime.now();
		return new Stats(occurrences.countHosted(null, organizationId, now),
				registrations.countHostedParticipants(null, organizationId, now));
	}

	/** hostedMeetings — прошедшие встречи, participantsTotal — разные подтверждённые участники. */
	public record Stats(long hostedMeetings, long participantsTotal) {
	}
}
