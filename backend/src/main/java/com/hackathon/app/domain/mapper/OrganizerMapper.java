package com.hackathon.app.domain.mapper;

import java.util.UUID;

import com.hackathon.app.domain.dto.OrganizerResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.EventOrganizer;
import com.hackathon.app.domain.dto.OrganizationShortResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = MappingConfig.class, uses = UserMapper.class)
public interface OrganizerMapper {

	EventOrganizer toEntity(UUID eventId, UUID userId, UUID addedById);

	@Mapping(target = "organization", source = "organization")
	OrganizerResponse toResponse(AppUser user, boolean author, OrganizationShortResponse organization);
}
