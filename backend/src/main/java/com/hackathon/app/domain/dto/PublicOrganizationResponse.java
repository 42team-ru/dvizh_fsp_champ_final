package com.hackathon.app.domain.dto;

import com.hackathon.app.domain.enums.ContactType;

import java.util.Map;
import java.util.UUID;


/** Публичная страница одобренной организации. */
public record PublicOrganizationResponse(UUID id, String name, String description, String city,
		Map<ContactType, String> contacts) {
}
