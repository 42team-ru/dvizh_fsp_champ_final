package com.hackathon.app.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import com.hackathon.app.domain.enums.QuorumStatus;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.OccurrenceAttendanceRepository;
import com.hackathon.app.repository.RegistrationRepository;
import com.hackathon.app.repository.SportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Данные для списков мероприятий (лента, карта, «мои»): по одному запросу на весь список, а не на каждое. */
@Component
@RequiredArgsConstructor
class EventListLookups {

	private final SportRepository sports;
	private final RegistrationRepository registrations;
	private final EventOccurrenceRepository occurrences;
	private final OccurrenceAttendanceRepository attendances;
	private final OccurrenceService occurrenceService;
	private final EventAccessPolicy policy;

	/**
	 * Виды спорта, число подтверждённых участников, статус записи пользователя, а также ближайшее подходящее
	 * занятие (в периоде списка), сколько на него отметились и расписание словами — для серий.
	 */
	record Lookups(Map<UUID, Sport> sportsById, Map<UUID, Long> confirmedByEventId,
			Map<UUID, RegistrationStatus> myStatusByEventId, Map<UUID, EventOccurrence> nextByEventId,
			Map<UUID, Long> attendeesByOccurrenceId, Map<UUID, String> scheduleByEventId,
			Set<UUID> cancelledSingleIds, EventAccessPolicy policy) {

		Sport sport(Event event) {
			return sportsById.get(event.getSportId());
		}

		long confirmed(Event event) {
			return confirmedByEventId.getOrDefault(event.getId(), 0L);
		}

		RegistrationStatus myStatus(Event event) {
			return myStatusByEventId.get(event.getId());
		}

		/** Ближайшее занятие в периоде, которое состоится; null — нет. */
		EventOccurrence next(Event event) {
			return nextByEventId.get(event.getId());
		}

		/** У серии — отметки на ближайшее занятие; у разового — null (там считаются записи). */
		Long occurrenceAttendees(Event event) {
			var next = next(event);
			if (!event.isRecurring() || next == null) {
				return null;
			}
			return attendeesByOccurrenceId.getOrDefault(next.getId(), 0L);
		}

		String scheduleDescription(Event event) {
			return scheduleByEventId.get(event.getId());
		}

		/** Разовое мероприятие отменено организатором. */
		boolean cancelledSingle(Event event) {
			return cancelledSingleIds.contains(event.getId());
		}

		/** Кворум ближайшего занятия; null — у мероприятия кворума нет или занятия нет. */
		QuorumStatus quorumStatus(Event event) {
			var next = next(event);
			if (next == null) {
				return null;
			}
			var count = event.isRecurring() ? occurrenceAttendees(event) : confirmed(event);
			return policy.quorumStatus(event, next, count);
		}
	}

	/** Ближайшее занятие ищется в [from, to]. */
	Lookups load(List<Event> eventList, UUID userId, Instant from, Instant to) {
		if (eventList.isEmpty()) {
			return new Lookups(Map.of(), Map.of(), Map.of(), Map.of(), Map.of(), Map.of(), Set.of(), policy);
		}
		var eventIds = eventList.stream().map(Event::getId).toList();
		Map<UUID, Sport> sportsById = sports.findAllById(eventList.stream().map(Event::getSportId).distinct().toList())
				.stream().collect(Collectors.toMap(Sport::getId, Function.identity()));
		var confirmedByEventId = registrations.countByEventIds(eventIds, RegistrationStatus.CONFIRMED).stream()
				.collect(Collectors.toMap(RegistrationRepository.EventCount::getEventId,
						RegistrationRepository.EventCount::getCount));
		var myStatusByEventId = registrations.findByUserIdAndEventIdIn(userId, eventIds).stream()
				.collect(Collectors.toMap(Registration::getEventId, Registration::getStatus));
		var nextByEventId = occurrences.findNearest(eventIds, OccurrenceStatus.SCHEDULED, from, to).stream()
				.collect(Collectors.toMap(EventOccurrence::getEventId, Function.identity(), (first, second) -> first));
		var seriesNextIds = eventList.stream().filter(Event::isRecurring)
				.map(event -> nextByEventId.get(event.getId())).filter(Objects::nonNull)
				.map(EventOccurrence::getId).toList();
		Map<UUID, Long> attendeesByOccurrenceId = seriesNextIds.isEmpty() ? Map.of()
				: attendances.countByOccurrenceIds(seriesNextIds).stream()
						.collect(Collectors.toMap(OccurrenceAttendanceRepository.OccurrenceCount::getOccurrenceId,
								OccurrenceAttendanceRepository.OccurrenceCount::getCount));
		return new Lookups(sportsById, confirmedByEventId, myStatusByEventId, nextByEventId, attendeesByOccurrenceId,
				occurrenceService.descriptions(eventList), Set.copyOf(occurrences.findCancelledSingleEventIds(eventIds)),
				policy);
	}

	/** findAllById не сохраняет порядок: возвращаем порядок из запроса (по ближайшему занятию). */
	static List<Event> sortedLike(List<Event> eventList, List<UUID> orderedIds) {
		var byId = eventList.stream().collect(Collectors.toMap(Event::getId, Function.identity()));
		return orderedIds.stream().map(byId::get).filter(Objects::nonNull).toList();
	}
}
