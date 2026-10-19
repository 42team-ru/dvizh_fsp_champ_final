package com.hackathon.app.dto;

import java.util.UUID;

/** Аккаунт организации для админа: логин, почта и контактное лицо. */
public record OrganizationAccountResponse(UUID id, String username, String email, String firstName,
		String lastName) {
}
