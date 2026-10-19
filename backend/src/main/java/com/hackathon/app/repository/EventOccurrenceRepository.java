package com.hackathon.app.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EventOccurrenceRepository extends JpaRepository<EventOccurrence, UUID> {

	List<EventOccurrence> findByEventIdOrderByStartAt(UUID eventId);

	Optional<EventOccurrence> findByIdAndEventId(UUID id, UUID eventId);

	/** Занятия мероприятия в периоде [from, to], по порядку. */
	List<EventOccurrence> findByEventIdAndStartAtBetweenOrderByStartAt(UUID eventId, Instant from, Instant to);

	/** Ближайшее занятие со статусом после момента after: открыта ли запись в серию. */
	Optional<EventOccurrence> findFirstByEventIdAndStatusAndStartAtAfterOrderByStartAt(UUID eventId,
			OccurrenceStatus status, Instant after);

	boolean existsByEventIdAndStatus(UUID eventId, OccurrenceStatus status);

	/** Отменённые занятия разовых мероприятий из списка — для пометки «отменено организатором» в ленте и «моих». */
	@Query("""
			select o.eventId from EventOccurrence o
			where o.eventId in :eventIds and o.source = com.hackathon.app.domain.enums.OccurrenceSource.SINGLE
			  and o.status = com.hackathon.app.domain.enums.OccurrenceStatus.CANCELLED""")
	List<UUID> findCancelledSingleEventIds(Collection<UUID> eventIds);

	/** Есть ли уже у серии занятие с таким началом (перенос и разовая дата не создают дублей). */
	boolean existsByEventIdAndStatusAndStartAt(UUID eventId, OccurrenceStatus status, Instant startAt);

	/**
	 * Для каждого мероприятия из списка — ближайшее занятие со статусом SCHEDULED в [from, to].
	 * Если у мероприятия два занятия в одно время (не бывает: дубли схлопываются), вернутся оба.
	 */
	@Query("""
			select o from EventOccurrence o
			where o.eventId in :eventIds and o.status = :status and o.startAt >= :from and o.startAt <= :to
			  and o.startAt = (select min(o2.startAt) from EventOccurrence o2
			                   where o2.eventId = o.eventId and o2.status = :status
			                     and o2.startAt >= :from and o2.startAt <= :to)""")
	List<EventOccurrence> findNearest(Collection<UUID> eventIds, OccurrenceStatus status, Instant from, Instant to);
}
