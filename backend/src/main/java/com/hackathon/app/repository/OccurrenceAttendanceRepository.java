package com.hackathon.app.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.OccurrenceAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface OccurrenceAttendanceRepository extends JpaRepository<OccurrenceAttendance, UUID> {

	/** Сколько отметок у каждого занятия из списка. */
	interface OccurrenceCount {

		UUID getOccurrenceId();

		long getCount();
	}

	Optional<OccurrenceAttendance> findByOccurrenceIdAndUserId(UUID occurrenceId, UUID userId);

	long countByOccurrenceId(UUID occurrenceId);

	/** Все отметки на занятии. */
	List<OccurrenceAttendance> findByOccurrenceId(UUID occurrenceId);

	/** Все отметки во всех занятиях серии. */
	List<OccurrenceAttendance> findByEventId(UUID eventId);

	/** Кто отметился на занятии. */
	@Query("select a.userId from OccurrenceAttendance a where a.occurrenceId = :occurrenceId")
	List<UUID> findUserIds(UUID occurrenceId);

	boolean existsByOccurrenceId(UUID occurrenceId);

	/** Мои отметки среди занятий из списка. */
	List<OccurrenceAttendance> findByUserIdAndOccurrenceIdIn(UUID userId, Collection<UUID> occurrenceIds);

	@Query("""
			select a.occurrenceId as occurrenceId, count(a) as count from OccurrenceAttendance a
			where a.occurrenceId in :occurrenceIds
			group by a.occurrenceId""")
	List<OccurrenceCount> countByOccurrenceIds(Collection<UUID> occurrenceIds);

	/** Самое заполненное будущее занятие серии: лимит мест нельзя опустить ниже этого числа. */
	@Query("""
			select count(a) from OccurrenceAttendance a join EventOccurrence o on o.id = a.occurrenceId
			where a.eventId = :eventId and o.startAt > :now
			group by a.occurrenceId
			order by count(a) desc""")
	List<Long> futureCountsDesc(UUID eventId, Instant now);

	@Query("""
			select u from OccurrenceAttendance a join AppUser u on u.id = a.userId
			where a.occurrenceId = :occurrenceId
			order by a.createdAt""")
	List<AppUser> findUsers(UUID occurrenceId);

	/** Мои ближайшие отмеченные занятия в сериях из списка, по порядку. */
	@Query("""
			select o from OccurrenceAttendance a join EventOccurrence o on o.id = a.occurrenceId
			where a.userId = :userId and a.eventId in :eventIds and o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED and o.startAt > :now
			order by o.startAt""")
	List<EventOccurrence> findMyUpcoming(UUID userId, Collection<UUID> eventIds, Instant now);

	/** Участник вышел из серии или исключён: будущие отметки снимаются, прошлые остаются. */
	@Modifying(flushAutomatically = true)
	@Query("""
			delete from OccurrenceAttendance a
			where a.eventId = :eventId and a.userId = :userId
			  and a.occurrenceId in (select o.id from EventOccurrence o where o.eventId = :eventId and o.startAt > :now)""")
	int deleteFuture(UUID eventId, UUID userId, Instant now);

    List<OccurrenceAttendance> findByOccurrenceIdIn(Collection<UUID> occurrenceIds);

}
