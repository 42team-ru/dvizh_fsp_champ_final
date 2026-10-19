package com.hackathon.app.service;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.repository.OccurrenceAttendanceRepository;
import com.hackathon.app.repository.RegistrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Кто «пришёл» на занятие, когда оно закончилось и состоялось ли оно по кворуму. Подтверждения посещения у нас нет
 * (см. AttendanceHistoryService): для разового мероприятия это подтверждённые записи, для серии — отметки на занятие.
 * Правила общие для начисления монет и для подсчёта «Организации месяца».
 */
@Component
@RequiredArgsConstructor
public class MeetingAttendance {

	/** Пояс «календарного дня» для дневных лимитов и месяцев: демо-город. */
	public static final ZoneId ZONE = ZoneId.of("Asia/Krasnoyarsk");
	/** Сколько длится занятие без времени окончания. */
	private static final Duration DEFAULT_LENGTH = Duration.ofHours(2);

	private final RegistrationRepository registrations;
	private final OccurrenceAttendanceRepository attendances;

	/** Участники занятия, без повторов. */
	public List<UUID> participants(Event event, EventOccurrence occurrence) {
		var ids = event.isRecurring() ? attendances.findUserIds(occurrence.getId())
				: registrations.findConfirmedUserIds(event.getId());
		return ids.stream().distinct().filter(id -> !id.equals(event.getAuthorId())).toList();
	}

	/** Конец занятия: endAt или начало + 2 часа. */
	public Instant endOf(EventOccurrence occurrence) {
		return occurrence.getEndAt() != null ? occurrence.getEndAt() : occurrence.getStartAt().plus(DEFAULT_LENGTH);
	}

	/** Кворум сорван: он задан, организатор не подтвердил занятие, а участников меньше. */
	public boolean quorumFailed(Event event, EventOccurrence occurrence, int participants) {
		return event.getMinParticipants() != null && occurrence.getConfirmedAt() == null
				&& participants < event.getMinParticipants();
	}
}
