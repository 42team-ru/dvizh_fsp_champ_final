package com.hackathon.app.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.entity.Organization;

/** Анкета глазами самой организации: со статусом допуска и причиной отказа. */
public record OrganizationResponse(UUID id, String name, String description, String city,
		Map<Organization.ContactType, String> contacts, Organization.Status status, String rejectReason,
		Instant submittedAt, Instant reviewedAt, Instant createdAt, Instant updatedAt) {
}
