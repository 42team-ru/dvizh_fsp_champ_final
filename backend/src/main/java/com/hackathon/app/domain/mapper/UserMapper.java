package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.PublicUserResponse;
import com.hackathon.app.domain.dto.UserShortResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.enums.SystemRole;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = MappingConfig.class)
public interface UserMapper {

	UserShortResponse toShort(AppUser user);

	PublicUserResponse toPublic(AppUser user, List<EventSummaryResponse> events);

	/** Активный аккаунт со входом по логину и паролю; пароль уже захеширован. */
	@Mapping(target = "active", constant = "true")
	@Mapping(target = "authProvider", constant = "LOCAL")
	AppUser toLocalUser(UUID id, String username, String email, String passwordHash, String firstName, String lastName,
			String city, String bio, SystemRole systemRole, Instant createdAt);
}
