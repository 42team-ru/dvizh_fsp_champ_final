package com.hackathon.app.repository;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.EventOrganizer;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.enums.TimeScope;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

/** Фильтры личных списков, выполняемые до пагинации в БД. */
public final class MineSpecifications {
    private MineSpecifications() {}

    private static Predicate time(Expression<UUID> eventId, TimeScope when, Instant now,
            CriteriaQuery<?> query, CriteriaBuilder cb) {
        if (when == null) return cb.conjunction();
        var future = query.subquery(UUID.class);
        var o = future.from(EventOccurrence.class);
        future.select(o.get("id")).where(cb.equal(o.get("eventId"), eventId),
                cb.equal(o.get("status"), OccurrenceStatus.SCHEDULED), cb.greaterThan(o.get("startAt"), now));
        return when == TimeScope.UPCOMING ? cb.exists(future) : cb.not(cb.exists(future));
    }

    public static Specification<Event> events(UUID userId, EventStatus status, TimeScope when, String searchText, Instant now) {
        return (e, query, cb) -> {
            var organizers = query.subquery(UUID.class);
            var o = organizers.from(EventOrganizer.class);
            organizers.select(o.get("eventId")).where(cb.equal(o.get("userId"), userId));
            return cb.and(cb.or(cb.equal(e.get("authorId"), userId), e.get("id").in(organizers)),
                    status == null ? cb.conjunction() : cb.equal(e.get("status"), status),
                    searchText == null || searchText.isBlank() ? cb.conjunction()
                        : cb.like(cb.lower(e.get("title")), "%" + searchText.trim().toLowerCase(Locale.ROOT) + "%"),
                    time(e.get("id"), when, now, query, cb));
        };
    }

    public static Specification<Registration> registrations(UUID userId, RegistrationStatus status, TimeScope when, Instant now) {
        return (r, query, cb) -> cb.and(cb.equal(r.get("userId"), userId),
                status == null ? cb.conjunction() : cb.equal(r.get("status"), status),
                time(r.get("eventId"), when, now, query, cb));
    }
}
