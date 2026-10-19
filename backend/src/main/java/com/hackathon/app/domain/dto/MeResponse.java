package com.hackathon.app.domain.dto;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.enums.AuthProvider;
import com.hackathon.app.domain.enums.SystemRole;

public record MeResponse(UUID id, String username, String email, String firstName, String lastName, boolean active,
		SystemRole systemRole, AuthProvider authProvider, Instant createdAt, String bio,
		String avatarUrl, String city) {

	public static MeResponse of(AppUser u) {
		return new MeResponse(u.getId(), u.getUsername(), u.getEmail(), u.getFirstName(), u.getLastName(), u.isActive(),
				u.getSystemRole(), u.getAuthProvider(), u.getCreatedAt(), u.getBio(), u.getAvatarUrl(), u.getCity());
	}
}
