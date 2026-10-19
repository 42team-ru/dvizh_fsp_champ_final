package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.entity.AppUser;
import com.hackathon.app.entity.Registration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RegistrationRepository extends JpaRepository<Registration, UUID> {

	Optional<Registration> findByEventIdAndUserId(UUID eventId, UUID userId);

	List<Registration> findByEventIdOrderByCreatedAt(UUID eventId);

	List<Registration> findByEventIdAndStatusOrderByCreatedAt(UUID eventId, Registration.Status status);

	long countByEventIdAndStatus(UUID eventId, Registration.Status status);

	@Query("""
			select u from Registration r join AppUser u on u.id = r.userId
			where r.eventId = :eventId and r.status = :status
			order by r.createdAt""")
	List<AppUser> findUsers(UUID eventId, Registration.Status status);
}
