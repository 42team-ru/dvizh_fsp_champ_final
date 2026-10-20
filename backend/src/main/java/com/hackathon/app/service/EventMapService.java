package com.hackathon.app.service;

import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.EventMapFilter;
import com.hackathon.app.domain.dto.EventMapResponse;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.mapper.EventMapper;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventMapRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.EventSpecifications;
import com.hackathon.app.util.Strings;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Мероприятия на карте: видимая область, окно по времени начала и фильтры ленты. */
@Service
@RequiredArgsConstructor
public class EventMapService {

	/** Больше точек за раз не отдаём: при отдалении карты фронт просит приблизить. */
	static final int LIMIT = 1000;
	/** Окно по умолчанию, если to не задан. */
	static final Duration DEFAULT_WINDOW = Duration.ofDays(30);

	private final EventMapRepository mapRepository;
	private final EventRepository events;
	private final EventListLookups listLookups;
	private final DbTimeRepository dbTime;
	private final EventMapper mapper;

	/**
	 * Опубликованные очные мероприятия с точкой в области и занятием в [from, to], ближайшие первыми; серия — одна точка
	 * со временем ближайшего занятия в периоде.
	 * Прошедшие не показываем: from не раньше текущего момента. Больше LIMIT — отдаём первые и truncated.
	 */
	@Transactional(readOnly = true)
	public EventMapResponse find(EventMapFilter filter, UUID userId) {
		if (filter.minLat() > filter.maxLat()) {
			throw new BadRequestException("Южная граница области должна быть не севернее северной");
		}
		if ((filter.lat() == null) != (filter.lon() == null)) {
			throw new BadRequestException("Для поиска рядом укажите и широту, и долготу");
		}
		var near = filter.lat() == null ? null : new EventSpecifications.Near(
				filter.lat(), filter.lon(), filter.radiusKm() != null ? filter.radiusKm() : 10);
		var now = dbTime.now();
		var from = filter.from() != null && filter.from().isAfter(now) ? filter.from() : now;
		var to = filter.to() != null ? filter.to() : from.plus(DEFAULT_WINDOW);
		if (to.isBefore(from)) {
			throw new BadRequestException("Конец периода должен быть позже начала и не в прошлом");
		}

		var ids = mapRepository.findIdsInArea(filter.minLon(), filter.minLat(), filter.maxLon(), filter.maxLat(),
				from, to, Strings.blankToNull(filter.searchText()), filter.sportId(), filter.level(),
				filter.joinMode(), Boolean.TRUE.equals(filter.forMe()) ? userId : null,
				filter.organizationId(), near, LIMIT + 1);
		var truncated = ids.size() > LIMIT;
		var shownIds = truncated ? ids.subList(0, LIMIT) : ids;

		var eventList = EventListLookups.sortedLike(events.findAllById(shownIds), shownIds);
		var lookups = listLookups.load(eventList, userId, from, to);
		var features = eventList.stream()
				.map(event -> mapper.toMapFeature(event, lookups.sport(event), lookups.confirmed(event),
						lookups.myStatus(event), lookups.next(event), lookups.scheduleDescription(event)))
				.toList();
		return mapper.toMapResponse(features, truncated, LIMIT);
	}
}
