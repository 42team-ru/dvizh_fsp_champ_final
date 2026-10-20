package com.hackathon.app.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.enums.RegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RegistrationRepository extends JpaRepository<Registration, UUID>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Registration> {

	@Query("""
            select r.userId as userId, count(r) as count from Registration r
            where r.userId in :userIds and r.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED
            group by r.userId""")
    List<UserCount> countConfirmedByUsers(Collection<UUID> userIds);

    /** Для дашборда админа. */
	long countByStatus(RegistrationStatus status);

	/** Сколько записей с нужным статусом у каждого мероприятия из списка. */
	interface EventCount {

		UUID getEventId();

		long getCount();
	}

	Optional<Registration> findByEventIdAndUserId(UUID eventId, UUID userId);

	/** Лист ожидания по порядку очереди: первым продвигается тот, кто встал раньше. */
	List<Registration> findByEventIdAndStatusOrderByQueuedAtAscIdAsc(UUID eventId, RegistrationStatus status);

	/** Сколько стоят в очереди раньше: место в листе ожидания = это число + 1. */
	long countByEventIdAndStatusAndQueuedAtBefore(UUID eventId, RegistrationStatus status, java.time.Instant queuedAt);

	List<Registration> findByUserIdAndEventIdIn(UUID userId, Collection<UUID> eventIds);

	List<Registration> findByUserIdOrderByCreatedAtDesc(UUID userId);

	List<Registration> findByEventIdOrderByCreatedAt(UUID eventId);

	List<Registration> findByEventIdAndStatusOrderByCreatedAt(UUID eventId, RegistrationStatus status);

	/** Кому важны новости мероприятия: id пользователей с записью в этих статусах. */
	@Query("select r.userId from Registration r where r.eventId = :eventId and r.status in :statuses")
	List<UUID> findUserIds(UUID eventId, Collection<RegistrationStatus> statuses);

	/** Подтверждённые участники мероприятия. */
	@Query("select r.userId from Registration r where r.eventId = :eventId and r.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED")
	List<UUID> findConfirmedUserIds(UUID eventId);

	long countByEventIdAndStatus(UUID eventId, RegistrationStatus status);

	/** Счётчик «записались N из M» для списка одним запросом, а не по запросу на мероприятие. */
	@Query("""
			select r.eventId as eventId, count(r) as count from Registration r
			where r.eventId in :eventIds and r.status = :status
			group by r.eventId""")
	List<EventCount> countByEventIds(Collection<UUID> eventIds, RegistrationStatus status);

	@Query("""
			select u from Registration r join AppUser u on u.id = r.userId
			where r.eventId = :eventId and r.status = :status
			order by r.createdAt""")
	List<AppUser> findUsers(UUID eventId, RegistrationStatus status);

	/**
	 * Доверие к организатору: сколько разных людей подтверждённо записывались на его прошедшие встречи
	 * (у мероприятия есть неотменённое занятие до now). Фильтр — как в EventOccurrenceRepository.countHosted.
	 */
	@Query("""
			select count(distinct r.userId) from Registration r join Event e on e.id = r.eventId
			where r.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED
			  and e.status <> com.hackathon.app.domain.enums.EventStatus.DELETED
			  and e.authorId = coalesce(:authorId, e.authorId)
			  and (:organizationId is null or e.organizationId = :organizationId)
			  and exists (select o.id from EventOccurrence o where o.eventId = e.id and o.startAt < :now
			      and o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED)""")
	long countHostedParticipants(UUID authorId, UUID organizationId, java.time.Instant now);

    List<Registration> findByEventIdInAndStatus(Collection<UUID> eventIds, RegistrationStatus status);

}
