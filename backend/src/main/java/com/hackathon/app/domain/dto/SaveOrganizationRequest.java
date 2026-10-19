package com.hackathon.app.domain.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.enums.ContactType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/**
 * Анкета организации. Формат каждого контакта проверяет сервис; нужен хотя бы один контакт.
 * Виды спорта — из справочника (sportIds) и/или свои названия (sportNames, создадутся как в форме мероприятия);
 * всего хотя бы один, набор заменяется целиком.
 */
public record SaveOrganizationRequest(
		@NotBlank @Size(max = 200) String name,
		@NotBlank @Size(max = 5000) String description,
		@Size(max = 100) String city,
		@NotEmpty Map<ContactType, @NotBlank @Size(max = 255) String> contacts,
		@Size(max = 10, message = "Не больше 10 видов спорта") List<UUID> sportIds,
		@Size(max = 10, message = "Не больше 10 видов спорта") List<@NotBlank @Size(max = 100) String> sportNames) {
}
