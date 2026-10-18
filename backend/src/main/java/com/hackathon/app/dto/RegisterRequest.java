package com.hackathon.app.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
		@NotBlank @Size(min = 3, max = 50) String username,
		@NotBlank @Email @Size(max = 255) String email,
		@NotBlank @Size(min = 2, max = 100) String firstName,
		@NotBlank @Size(min = 2, max = 100) String lastName,
		@NotBlank @Size(min = 8, max = 128) String password) {
}
