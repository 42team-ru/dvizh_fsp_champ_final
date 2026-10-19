package com.hackathon.app.domain.dto;

import java.util.Map;

import com.hackathon.app.domain.enums.ContactType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/** Анкета организации. Формат каждого контакта проверяет сервис; нужен хотя бы один контакт. */
public record SaveOrganizationRequest(
		@NotBlank @Size(max = 200) String name,
		@NotBlank @Size(max = 5000) String description,
		@Size(max = 100) String city,
		@NotEmpty Map<ContactType, @NotBlank @Size(max = 255) String> contacts) {
}
