package com.hackathon.app.domain.dto;

import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.enums.SystemRole;

/** Демо-аккаунт для быстрого входа. password публичный и отдаётся только в демо-режиме. */
public record DemoAccountResponse(String username, String password, String firstName, String lastName,
		SystemRole systemRole) {

	public static DemoAccountResponse of(AppUser u, String password) {
		return new DemoAccountResponse(u.getUsername(), password, u.getFirstName(), u.getLastName(), u.getSystemRole());
	}
}
