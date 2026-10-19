package com.hackathon.app.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.RegistrationStatus;
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

	/** Виды спорта, число подтверждённых участников и статус записи пользователя для каждого мероприятия. */
	record Lookups(Map<UUID, Sport> sportsById, Map<UUID, Long> confirmedByEventId,
			Map<UUID, RegistrationStatus> myStatusByEventId) {

		Sport sport(Event event) {
			return sportsById.get(event.getSportId());
		}

		long confirmed(Event event) {
			return confirmedByEventId.getOrDefault(event.getId(), 0L);
		}

		RegistrationStatus myStatus(Event event) {
			return myStatusByEventId.get(event.getId());
		}
	}

	Lookups load(List<Event> eventList, UUID userId) {
		if (eventList.isEmpty()) {
			return new Lookups(Map.of(), Map.of(), Map.of());
		}
		var eventIds = eventList.stream().map(Event::getId).toList();
		Map<UUID, Sport> sportsById = sports.findAllById(eventList.stream().map(Event::getSportId).distinct().toList())
				.stream().collect(Collectors.toMap(Sport::getId, Function.identity()));
		var confirmedByEventId = registrations.countByEventIds(eventIds, RegistrationStatus.CONFIRMED).stream()
				.collect(Collectors.toMap(RegistrationRepository.EventCount::getEventId,
						RegistrationRepository.EventCount::getCount));
		var myStatusByEventId = registrations.findByUserIdAndEventIdIn(userId, eventIds).stream()
				.collect(Collectors.toMap(Registration::getEventId, Registration::getStatus));
		return new Lookups(sportsById, confirmedByEventId, myStatusByEventId);
	}
}
