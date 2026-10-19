package com.hackathon.app.domain.mapper;

import java.util.UUID;

import com.hackathon.app.domain.dto.OrganizerResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.EventOrganizer;
import org.mapstruct.Mapper;

@Mapper(config = MappingConfig.class, uses = UserMapper.class)
public interface OrganizerMapper {

	EventOrganizer toEntity(UUID eventId, UUID userId, UUID addedById);

	OrganizerResponse toResponse(AppUser user, boolean author);
}
