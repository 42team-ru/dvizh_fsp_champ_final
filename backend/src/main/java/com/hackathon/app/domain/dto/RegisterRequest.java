package com.hackathon.app.domain.dto;

import com.hackathon.app.domain.enums.AccountType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** firstName и lastName у аккаунта организации — контактное лицо. */
public record RegisterRequest(
		@NotBlank @Size(min = 3, max = 50) String username,
		@NotBlank @Email @Size(max = 255) String email,
		@NotBlank @Size(min = 2, max = 100) String firstName,
		@NotBlank @Size(min = 2, max = 100) String lastName,
		@NotBlank @Size(min = 8, max = 128) String password,
		AccountType accountType) {
}
