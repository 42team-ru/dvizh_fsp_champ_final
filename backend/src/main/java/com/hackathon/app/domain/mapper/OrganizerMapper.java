package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.dto.OrganizerInvitationResponse;
import com.hackathon.app.domain.dto.OrganizerResponse;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.OrganizerInvitation;
import com.hackathon.app.domain.enums.OrganizerInviteStatus;
import org.mapstruct.MappingTarget;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.EventOrganizer;
import com.hackathon.app.domain.dto.OrganizationShortResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = MappingConfig.class, uses = UserMapper.class)
public interface OrganizerMapper {

	EventOrganizer toEntity(UUID eventId, UUID userId, UUID addedById);

	@Mapping(target = "organization", source = "organization")
	OrganizerResponse toResponse(AppUser user, boolean author, OrganizationShortResponse organization, boolean invited);

	/** Новое приглашение: ждёт ответа. */
	@Mapping(target = "status", constant = "PENDING")
	OrganizerInvitation toInvitation(UUID eventId, UUID userId, UUID invitedById);

	/** Повторное приглашение в ту же строку: снова ждёт ответа, прошлое решение стирается. */
	@Mapping(target = "status", constant = "PENDING")
	@Mapping(target = "decidedAt", expression = "java(null)")
	void reinvite(@MappingTarget OrganizerInvitation invitation, UUID invitedById);

	/** Ответ приглашённого или отзыв автором. */
	void decide(@MappingTarget OrganizerInvitation invitation, OrganizerInviteStatus status, Instant decidedAt);

	@Mapping(target = "eventId", source = "event.id")
	@Mapping(target = "eventTitle", source = "event.title")
	@Mapping(target = "invitedBy", source = "invitedBy")
	@Mapping(target = "invitedAt", source = "invitation.updatedAt")
	OrganizerInvitationResponse toInvitationResponse(OrganizerInvitation invitation, Event event, AppUser invitedBy);
}
