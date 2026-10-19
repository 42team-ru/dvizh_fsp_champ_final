package com.hackathon.app.domain.dto;

import com.hackathon.app.domain.enums.ContactType;
import com.hackathon.app.domain.enums.OrganizationStatus;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;


/** Организация в админке: анкета, решение и аккаунт, который её подал. */
public record AdminOrganizationResponse(UUID id, String name, String description, String city,
		Map<ContactType, String> contacts, OrganizationStatus status, String rejectReason,
		Instant submittedAt, Instant reviewedAt, UUID reviewedById, OrganizationAccountResponse account,
		Instant createdAt, Instant updatedAt, String logoUrl, List<FileResponse> documents) {
}
