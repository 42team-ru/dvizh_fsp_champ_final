package com.hackathon.app.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

	/**
	 * История посещений: прошедшие занятия, на которые человек собирался. Разовое — подтверждённая запись,
	 * серия — отметка на занятие. Отменённые занятия и снятые или удалённые мероприятия не считаются.
	 * to — не позже текущего момента (передаёт сервис); sportId необязателен.
	 */
	@Query(value = """
			select o from EventOccurrence o join Event e on e.id = o.eventId
			where o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED
			  and o.startAt >= :from and o.startAt < :to
			  and e.status = com.hackathon.app.domain.enums.EventStatus.PUBLISHED
			  and e.sportId = coalesce(:sportId, e.sportId)
			  and ((e.recurring = false and exists (select r.id from Registration r where r.eventId = e.id
			          and r.userId = :userId and r.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED))
			    or (e.recurring = true and exists (select a.id from OccurrenceAttendance a
			          where a.occurrenceId = o.id and a.userId = :userId)))
			order by o.startAt desc, o.id""",
			countQuery = """
			select count(o) from EventOccurrence o join Event e on e.id = o.eventId
			where o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED
			  and o.startAt >= :from and o.startAt < :to
			  and e.status = com.hackathon.app.domain.enums.EventStatus.PUBLISHED
			  and e.sportId = coalesce(:sportId, e.sportId)
			  and ((e.recurring = false and exists (select r.id from Registration r where r.eventId = e.id
			          and r.userId = :userId and r.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED))
			    or (e.recurring = true and exists (select a.id from OccurrenceAttendance a
			          where a.occurrenceId = o.id and a.userId = :userId)))""")
	Page<EventOccurrence> findAttended(UUID userId, UUID sportId, Instant from, Instant to, Pageable pageable);

	/** Сколько посещений у каждого вида спорта — для сводки истории. */
	interface SportCount {
		UUID getSportId();

		long getCount();
	}

	@Query("""
			select e.sportId as sportId, count(o) as count from EventOccurrence o join Event e on e.id = o.eventId
			where o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED
			  and o.startAt >= :from and o.startAt < :to
			  and e.status = com.hackathon.app.domain.enums.EventStatus.PUBLISHED
			  and e.sportId = coalesce(:sportId, e.sportId)
			  and ((e.recurring = false and exists (select r.id from Registration r where r.eventId = e.id
			          and r.userId = :userId and r.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED))
			    or (e.recurring = true and exists (select a.id from OccurrenceAttendance a
			          where a.occurrenceId = o.id and a.userId = :userId)))
			group by e.sportId
			order by count(o) desc""")
	List<SportCount> countAttendedBySport(UUID userId, UUID sportId, Instant from, Instant to);
}
