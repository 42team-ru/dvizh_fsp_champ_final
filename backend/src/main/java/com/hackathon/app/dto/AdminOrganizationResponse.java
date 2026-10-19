package com.hackathon.app.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.entity.Organization;

/** Организация в админке: анкета, решение и аккаунт, который её подал. */
public record AdminOrganizationResponse(UUID id, String name, String description, String city,
		Map<Organization.ContactType, String> contacts, Organization.Status status, String rejectReason,
		Instant submittedAt, Instant reviewedAt, UUID reviewedById, OrganizationAccountResponse account,
		Instant createdAt, Instant updatedAt) {
}
