package com.hackathon.app.service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.AttendanceSummaryResponse;
import com.hackathon.app.domain.dto.AttendedOccurrenceResponse;
import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.mapper.AttendanceMapper;
import com.hackathon.app.domain.mapper.SportMapper;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.EventOccurrenceRepository.SportCount;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.SportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * История посещений. Подтверждения посещения у нас нет, поэтому «был» = собирался и занятие состоялось:
 * разовое — подтверждённая запись, серия — отметка на занятие; занятие прошло, не отменено, мероприятие не снято.
 */
@Service
@RequiredArgsConstructor
public class AttendanceHistoryService {

	private static final int MAX_PAGE_SIZE = 100;
	/** Без from — с самого начала. */
	private static final Instant BEGINNING = Instant.parse("2000-01-01T00:00:00Z");

	private final EventOccurrenceRepository occurrences;
	private final EventRepository events;
	private final EventService eventService;
	private final SportRepository sports;
	private final SportMapper sportMapper;
	private final AttendanceMapper mapper;
	private final DbTimeRepository dbTime;

	/** Свежие сверху; период [from, to), to не позже текущего момента. */
	@Transactional(readOnly = true)
	public PageResponse<AttendedOccurrenceResponse> history(UUID userId, UUID sportId, Instant from, Instant to,
			int page, int size) {
		var period = period(from, to);
		var result = occurrences.findAttended(userId, sportId, period.from(), period.to(),
				PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE)));
		var eventIds = result.getContent().stream().map(EventOccurrence::getEventId).distinct().toList();
		Map<UUID, EventSummaryResponse> eventById = eventService.summaries(events.findAllById(eventIds), userId).stream()
				.collect(Collectors.toMap(EventSummaryResponse::id, Function.identity()));
		return PageResponse.of(result, o -> mapper.toAttended(o, eventById.get(o.getEventId())));
	}

	/** Всего посещений и по видам спорта, самые частые первыми. */
	@Transactional(readOnly = true)
	public AttendanceSummaryResponse summary(UUID userId, Instant from, Instant to) {
		var period = period(from, to);
		var counts = occurrences.countAttendedBySport(userId, null, period.from(), period.to());
		var sportById = sports.findAllById(counts.stream().map(SportCount::getSportId).toList()).stream()
				.collect(Collectors.toMap(Sport::getId, Function.identity()));
		var bySport = counts.stream()
				.filter(c -> sportById.containsKey(c.getSportId()))
				.map(c -> mapper.toSportAttendance(sportMapper.toResponse(sportById.get(c.getSportId())), c.getCount()))
				.toList();
		return mapper.toSummary(counts.stream().mapToLong(SportCount::getCount).sum(), bySport);
	}

	/** Сколько всего посещений — для публичного профиля. */
	@Transactional(readOnly = true)
	public long total(UUID userId) {
		return summary(userId, null, null).total();
	}

	private Period period(Instant from, Instant to) {
		if (from != null && to != null && !from.isBefore(to)) {
			throw new BadRequestException("Начало периода должно быть раньше конца");
		}
		var now = dbTime.now();
		return new Period(from != null ? from : BEGINNING, to != null && to.isBefore(now) ? to : now);
	}

	private record Period(Instant from, Instant to) {
	}
}
