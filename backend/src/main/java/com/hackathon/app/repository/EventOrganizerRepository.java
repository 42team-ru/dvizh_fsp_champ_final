package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.entity.EventOrganizer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventOrganizerRepository extends JpaRepository<EventOrganizer, UUID> {

	boolean existsByEventIdAndUserId(UUID eventId, UUID userId);

	Optional<EventOrganizer> findByEventIdAndUserId(UUID eventId, UUID userId);

	List<EventOrganizer> findByEventIdOrderByCreatedAt(UUID eventId);
}
