package com.hackathon.app.repository;

import java.util.ArrayList;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.JoinMode;
import jakarta.persistence.criteria.Predicate;
import lombok.experimental.UtilityClass;
import org.springframework.data.jpa.domain.Specification;

/**
 * Фильтры ленты на Criteria API: условия на само мероприятие. Период по датам проверяется по занятиям
 * в {@link EventFeedRepository}. Те же фильтры для карты — в {@link EventMapRepository}: меняешь одно — поменяй и другое.
 */
@UtilityClass
public class EventSpecifications {

	/**
	 * Только опубликованные; null-фильтры не применяются. Событие уровня ANY подходит под любой level.
	 * mySports — лента «Для меня»: вид спорта → уровень пользователя (null — любой); пустая карта ничего не пропускает.
	 */
	public Specification<Event> feed(String searchText, UUID sportId, EventLevel level, JoinMode joinMode,
			EventFormat format, UUID organizationId, Map<UUID, EventLevel> mySports) {
		return (root, query, criteria) -> {
			var conditions = new ArrayList<Predicate>();
			conditions.add(criteria.equal(root.get("status"), EventStatus.PUBLISHED));
			if (searchText != null) {
				var pattern = "%" + searchText.toLowerCase(Locale.ROOT) + "%";
				conditions.add(criteria.or(criteria.like(criteria.lower(root.get("title")), pattern),
						criteria.like(criteria.lower(root.get("description")), pattern)));
			}
			if (sportId != null) {
				conditions.add(criteria.equal(root.get("sportId"), sportId));
			}
			if (level != null) {
				conditions.add(root.get("level").in(level, EventLevel.ANY));
			}
			if (joinMode != null) {
				conditions.add(criteria.equal(root.get("joinMode"), joinMode));
			}
			if (organizationId != null) {
				conditions.add(criteria.equal(root.get("organizationId"), organizationId));
			}
			if (format != null) {
				conditions.add(criteria.equal(root.get("format"), format));
			}
			if (mySports != null) {
				var matches = new ArrayList<Predicate>();
				mySports.forEach((mySportId, myLevel) -> matches.add(myLevel == null
						? criteria.equal(root.get("sportId"), mySportId)
						: criteria.and(criteria.equal(root.get("sportId"), mySportId),
								root.get("level").in(myLevel, EventLevel.ANY))));
				conditions.add(matches.isEmpty() ? criteria.disjunction() : criteria.or(matches.toArray(Predicate[]::new)));
			}
			return criteria.and(conditions.toArray(Predicate[]::new));
		};
	}

	/** Опубликованные мероприятия автора — для его публичного профиля. */
	public Specification<Event> publishedByAuthor(UUID authorId) {
		return (root, query, criteria) -> criteria.and(criteria.equal(root.get("status"), EventStatus.PUBLISHED),
				criteria.equal(root.get("authorId"), authorId));
	}
}
