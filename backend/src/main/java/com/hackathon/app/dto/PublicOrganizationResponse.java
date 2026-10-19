package com.hackathon.app.dto;

import java.util.Map;
import java.util.UUID;

import com.hackathon.app.entity.Organization;

/** Публичная страница одобренной организации. */
public record PublicOrganizationResponse(UUID id, String name, String description, String city,
		Map<Organization.ContactType, String> contacts) {
}
