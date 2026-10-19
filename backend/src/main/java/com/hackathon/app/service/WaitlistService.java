package com.hackathon.app.service;

import java.time.Instant;

import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.JoinMode;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.mapper.RegistrationMapper;
import com.hackathon.app.repository.RegistrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Лист ожидания свободного разового мероприятия без мест. Отдельно от RegistrationService, потому что продвигать
 * очередь нужно и из записи (отмена, исключение), и из правки мероприятия (лимит мест увеличили).
 * Вызывать под уже взятой блокировкой строки мероприятия: два освободившихся места не уйдут одному человеку.
 */
@Component
@RequiredArgsConstructor
public class WaitlistService {

	private final RegistrationRepository registrations;
	private final RegistrationMapper mapper;
	private final EventAccessPolicy policy;

	/** Место в очереди: 1 — следующий; null — запись не в листе ожидания. */
	public Integer position(Registration registration) {
		if (registration == null || registration.getStatus() != RegistrationStatus.WAITLISTED) {
			return null;
		}
		return Math.toIntExact(registrations.countByEventIdAndStatusAndQueuedAtBefore(registration.getEventId(),
				RegistrationStatus.WAITLISTED, registration.getQueuedAt()) + 1);
	}

	/**
	 * Освободились места — первые в очереди становятся участниками. Только пока запись вообще открыта:
	 * опубликовано, свободный режим, не отменено, организация допущена, ещё не началось.
	 */
	public void promote(Event event, Instant now) {
		if (event.isRecurring() || event.getJoinMode() != JoinMode.FREE || event.getStatus() != EventStatus.PUBLISHED
				|| policy.isSingleCancelled(event) || policy.isOrganizationSuspended(event)
				|| !event.getStartAt().isAfter(now)) {
			return;
		}
		var queue = registrations.findByEventIdAndStatusOrderByQueuedAtAscIdAsc(event.getId(), RegistrationStatus.WAITLISTED);
		long confirmed = registrations.countByEventIdAndStatus(event.getId(), RegistrationStatus.CONFIRMED);
		for (var registration : queue) {
			if (event.getCapacity() != null && confirmed >= event.getCapacity()) {
				return;
			}
			registrations.saveAndFlush(mapper.promote(registration, now));
			confirmed++;
		}
	}
}
