package com.hackathon.app.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.entity.AppUser;
import com.hackathon.app.entity.Registration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RegistrationRepository extends JpaRepository<Registration, UUID> {

	/** Сколько записей с нужным статусом у каждого мероприятия из списка. */
	interface EventCount {

		UUID getEventId();

		long getCount();
	}

	Optional<Registration> findByEventIdAndUserId(UUID eventId, UUID userId);

	List<Registration> findByUserIdAndEventIdIn(UUID userId, Collection<UUID> eventIds);

	List<Registration> findByUserIdOrderByCreatedAtDesc(UUID userId);

	List<Registration> findByEventIdOrderByCreatedAt(UUID eventId);

	List<Registration> findByEventIdAndStatusOrderByCreatedAt(UUID eventId, Registration.Status status);

	long countByEventIdAndStatus(UUID eventId, Registration.Status status);

	/** Счётчик «записались N из M» для списка одним запросом, а не по запросу на мероприятие. */
	@Query("""
			select r.eventId as eventId, count(r) as count from Registration r
			where r.eventId in :eventIds and r.status = :status
			group by r.eventId""")
	List<EventCount> countByEventIds(Collection<UUID> eventIds, Registration.Status status);

	@Query("""
			select u from Registration r join AppUser u on u.id = r.userId
			where r.eventId = :eventId and r.status = :status
			order by r.createdAt""")
	List<AppUser> findUsers(UUID eventId, Registration.Status status);
}
