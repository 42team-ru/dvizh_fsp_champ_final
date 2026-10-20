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

	/** Начавшиеся занятия, по которым ещё не начислены награды: порядок по началу, конец проверяет сервис. */
	@Query("""
			select o from EventOccurrence o
			where o.rewardProcessedAt is null and o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED
			  and o.startAt <= :now
			order by o.startAt, o.id""")
	List<EventOccurrence> findPendingReward(Instant now);

	/** Все начавшиеся необработанные занятия считаем обработанными (старт демо-экономики: задним числом не платим). */
	@org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
	@Query("update EventOccurrence o set o.rewardProcessedAt = :now where o.rewardProcessedAt is null and o.startAt <= :now")
	int markStartedProcessed(Instant now);

	/** Состоявшиеся и начавшиеся занятия опубликованных мероприятий одной организации. */
	@Query("""
			select o from EventOccurrence o join Event e on e.id = o.eventId
			where e.organizationId = :organizationId and e.status = com.hackathon.app.domain.enums.EventStatus.PUBLISHED
			  and o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED and o.startAt <= :now
			order by o.startAt""")
	List<EventOccurrence> findOrganizationStarted(UUID organizationId, Instant now);

	/** Занятия мероприятий организаций в [from, to) — для «Организации месяца». */
	@Query("""
			select o from EventOccurrence o join Event e on e.id = o.eventId
			where e.organizationId is not null and e.status = com.hackathon.app.domain.enums.EventStatus.PUBLISHED
			  and o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED
			  and o.startAt >= :from and o.startAt < :to
			order by o.startAt""")
	List<EventOccurrence> findOrganizationOccurrences(Instant from, Instant to);

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

	/**
	 * Доверие к организатору: сколько встреч уже прошло — неотменённые занятия, начавшиеся до now, у его неудалённых
	 * мероприятий. Ровно один из authorId и organizationId задан: человек или организация.
	 */
	@Query("""
			select count(o) from EventOccurrence o join Event e on e.id = o.eventId
			where o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED and o.startAt < :now
			  and e.status <> com.hackathon.app.domain.enums.EventStatus.DELETED
			  and e.authorId = coalesce(:authorId, e.authorId)
			  and (:organizationId is null or e.organizationId = :organizationId)""")
	long countHosted(UUID authorId, UUID organizationId, Instant now);

    /** Все публичные неотменённые занятия клуба для сводки (серии учитываются по занятиям). */
    @Query("""
        select oc from EventOccurrence oc join Event e on e.id = oc.eventId
        where e.organizationId = :organizationId and e.status = com.hackathon.app.domain.enums.EventStatus.PUBLISHED
        and oc.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED
        order by oc.startAt, oc.id
        """)
    List<EventOccurrence> findPublicOrganization(UUID organizationId);





    @Query("""
        select oc from EventOccurrence oc join Event e on e.id = oc.eventId
        where e.organizationId in :organizationIds and e.status = com.hackathon.app.domain.enums.EventStatus.PUBLISHED
        and oc.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED and oc.startAt < :now
        """)
    List<EventOccurrence> findStartedOrganizations(Collection<UUID> organizationIds, Instant now);

    @Query("""
        select distinct e.organizationId from EventOccurrence oc join Event e on e.id = oc.eventId
        where e.organizationId in :organizationIds and e.status = com.hackathon.app.domain.enums.EventStatus.PUBLISHED
        and oc.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED and oc.startAt < :now
        and ((e.recurring = false and exists (select r.id from Registration r where r.eventId = e.id and r.userId = :userId
            and r.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED))
        or (e.recurring = true and exists (select a.id from OccurrenceAttendance a where a.occurrenceId = oc.id and a.userId = :userId)))
        """)
    List<UUID> attendedOrganizations(Collection<UUID> organizationIds, UUID userId, Instant now);

    /**
     * Занятия, закончившиеся в окне [from, now] (без конца — по началу): человек организатор или подтверждённый
     * участник, мероприятие не удалено. Свежие сверху — для «Как прошло? Напиши пост».
     */
    @Query("""
        select o from EventOccurrence o join Event e on e.id = o.eventId
        where o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED
          and e.status <> com.hackathon.app.domain.enums.EventStatus.DELETED
          and coalesce(o.endAt, o.startAt) <= :now and coalesce(o.endAt, o.startAt) >= :from
          and (e.authorId = :userId
            or e.id in (select x.eventId from EventOrganizer x where x.userId = :userId)
            or e.id in (select r.eventId from Registration r where r.userId = :userId
                and r.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED))
        order by coalesce(o.endAt, o.startAt) desc, o.id""")
    List<EventOccurrence> findFinishedFor(UUID userId, Instant from, Instant now, Pageable limit);
}
