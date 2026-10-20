package com.hackathon.app.repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

/**
 * Лента по занятиям: мероприятие попадает в выдачу, если хоть одно его занятие (SCHEDULED) начинается в [from, to].
 * Серия — одна строка, порядок — по ближайшему подходящему занятию. Criteria API, поэтому работает и на H2.
 */
@Repository
@RequiredArgsConstructor
public class EventFeedRepository {

	private final EntityManager em;

	/**
	 * id мероприятий, подходящих под eventFilter (условия на само мероприятие) и с занятием в [from, to],
	 * ближайшие первыми, не больше limit. to = null — без верхней границы.
	 */
	public List<UUID> findIds(Specification<Event> eventFilter, Instant from, Instant to, int limit) {
		return findIds(eventFilter, from, to, limit, 0);
	}

	/** То же со сдвигом: страница ленты (offset — сколько пропустить). */
	public List<UUID> findIds(Specification<Event> eventFilter, Instant from, Instant to, int limit, int offset) {
		var criteria = em.getCriteriaBuilder();
		var query = criteria.createTupleQuery();
		var occurrence = query.from(EventOccurrence.class);
		var event = query.from(Event.class);

		var conditions = conditions(eventFilter, from, to, criteria, query, occurrence, event);

		var nearestStart = criteria.<Instant>least(occurrence.get("startAt"));
		query.multiselect(event.get("id"), nearestStart)
				.where(conditions.toArray(Predicate[]::new))
				.groupBy(event.get("id"))
				.orderBy(criteria.asc(nearestStart), criteria.asc(event.get("id")));
		return em.createQuery(query).setFirstResult(offset).setMaxResults(limit).getResultList().stream()
				.map((Tuple row) -> row.get(0, UUID.class))
				.toList();
	}

	/** Число событий по тем же условиям; несколько занятий серии считаются одним событием. */
	public long count(Specification<Event> eventFilter, Instant from, Instant to) {
		var criteria = em.getCriteriaBuilder();
		var query = criteria.createQuery(Long.class);
		var occurrence = query.from(EventOccurrence.class);
		var event = query.from(Event.class);
		var conditions = conditions(eventFilter, from, to, criteria, query, occurrence, event);
		query.select(criteria.countDistinct(event.get("id")))
				.where(conditions.toArray(Predicate[]::new));
		return em.createQuery(query).getSingleResult();
	}

	private List<Predicate> conditions(Specification<Event> eventFilter,
			Instant from, Instant to, CriteriaBuilder criteria,
			CriteriaQuery<?> query,
			Root<EventOccurrence> occurrence,
			Root<Event> event) {
		var conditions = new ArrayList<Predicate>();
		conditions.add(criteria.equal(occurrence.get("eventId"), event.get("id")));
		conditions.add(criteria.equal(occurrence.get("status"), OccurrenceStatus.SCHEDULED));
		conditions.add(criteria.greaterThanOrEqualTo(occurrence.get("startAt"), from));
		if (to != null) {
			conditions.add(criteria.lessThanOrEqualTo(occurrence.get("startAt"), to));
		}
		var eventCondition = eventFilter.toPredicate(event, query, criteria);
		if (eventCondition != null) {
			conditions.add(eventCondition);
		}

		return conditions;
	}
}
