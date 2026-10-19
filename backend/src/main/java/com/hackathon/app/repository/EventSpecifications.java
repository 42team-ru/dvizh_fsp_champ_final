package com.hackathon.app.repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Locale;
import java.util.UUID;

import com.hackathon.app.entity.Event;
import jakarta.persistence.criteria.Predicate;
import lombok.experimental.UtilityClass;
import org.springframework.data.jpa.domain.Specification;

/** Фильтры ленты на Criteria API. */
@UtilityClass
public class EventSpecifications {

	/** Только опубликованные; null-фильтры не применяются. Событие уровня ANY подходит под любой level. */
	public Specification<Event> feed(String q, UUID sportId, Instant from, Instant to, Event.Level level,
			Event.JoinMode joinMode, Event.Format format) {
		return (root, query, cb) -> {
			var where = new ArrayList<Predicate>();
			where.add(cb.equal(root.get("status"), Event.Status.PUBLISHED));
			if (q != null) {
				var like = "%" + q.toLowerCase(Locale.ROOT) + "%";
				where.add(cb.or(cb.like(cb.lower(root.get("title")), like),
						cb.like(cb.lower(root.get("description")), like)));
			}
			if (sportId != null) {
				where.add(cb.equal(root.get("sportId"), sportId));
			}
			if (from != null) {
				where.add(cb.greaterThanOrEqualTo(root.get("startAt"), from));
			}
			if (to != null) {
				where.add(cb.lessThanOrEqualTo(root.get("startAt"), to));
			}
			if (level != null) {
				where.add(root.get("level").in(level, Event.Level.ANY));
			}
			if (joinMode != null) {
				where.add(cb.equal(root.get("joinMode"), joinMode));
			}
			if (format != null) {
				where.add(cb.equal(root.get("format"), format));
			}
			return cb.and(where.toArray(Predicate[]::new));
		};
	}
}
