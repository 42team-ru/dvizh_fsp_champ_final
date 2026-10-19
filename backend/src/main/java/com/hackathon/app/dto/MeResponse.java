package com.hackathon.app.dto;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.entity.AppUser;

public record MeResponse(UUID id, String username, String email, String firstName, String lastName, boolean active,
		AppUser.SystemRole systemRole, AppUser.AuthProvider authProvider, Instant createdAt, String bio,
		String avatarUrl, String city) {

	public static MeResponse of(AppUser u) {
		return new MeResponse(u.getId(), u.getUsername(), u.getEmail(), u.getFirstName(), u.getLastName(), u.isActive(),
				u.getSystemRole(), u.getAuthProvider(), u.getCreatedAt(), u.getBio(), u.getAvatarUrl(), u.getCity());
	}
}
