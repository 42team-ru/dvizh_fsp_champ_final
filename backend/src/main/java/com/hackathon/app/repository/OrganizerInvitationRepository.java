package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.OrganizerInvitation;
import com.hackathon.app.domain.enums.OrganizerInviteStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizerInvitationRepository extends JpaRepository<OrganizerInvitation, UUID> {

	Optional<OrganizerInvitation> findByEventIdAndUserId(UUID eventId, UUID userId);

	List<OrganizerInvitation> findByEventIdOrderByCreatedAt(UUID eventId);

	List<OrganizerInvitation> findByEventIdAndStatusOrderByCreatedAt(UUID eventId, OrganizerInviteStatus status);

	List<OrganizerInvitation> findByUserIdAndStatusOrderByUpdatedAtDesc(UUID userId, OrganizerInviteStatus status);
}
