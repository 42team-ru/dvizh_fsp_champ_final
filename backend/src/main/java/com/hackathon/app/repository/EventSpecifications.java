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
	public Specification<Event> feed(String searchText, UUID sportId, Instant from, Instant to, Event.Level level,
			Event.JoinMode joinMode, Event.Format format) {
		return (root, query, criteria) -> {
			var conditions = new ArrayList<Predicate>();
			conditions.add(criteria.equal(root.get("status"), Event.Status.PUBLISHED));
			if (searchText != null) {
				var pattern = "%" + searchText.toLowerCase(Locale.ROOT) + "%";
				conditions.add(criteria.or(criteria.like(criteria.lower(root.get("title")), pattern),
						criteria.like(criteria.lower(root.get("description")), pattern)));
			}
			if (sportId != null) {
				conditions.add(criteria.equal(root.get("sportId"), sportId));
			}
			if (from != null) {
				conditions.add(criteria.greaterThanOrEqualTo(root.get("startAt"), from));
			}
			if (to != null) {
				conditions.add(criteria.lessThanOrEqualTo(root.get("startAt"), to));
			}
			if (level != null) {
				conditions.add(root.get("level").in(level, Event.Level.ANY));
			}
			if (joinMode != null) {
				conditions.add(criteria.equal(root.get("joinMode"), joinMode));
			}
			if (format != null) {
				conditions.add(criteria.equal(root.get("format"), format));
			}
			return criteria.and(conditions.toArray(Predicate[]::new));
		};
	}
}
