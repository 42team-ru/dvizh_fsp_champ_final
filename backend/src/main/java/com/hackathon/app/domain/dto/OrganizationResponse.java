package com.hackathon.app.domain.dto;

import com.hackathon.app.domain.enums.ContactType;
import com.hackathon.app.domain.enums.OrganizationStatus;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;


/** Анкета глазами самой организации: со статусом допуска и причиной отказа. */
public record OrganizationResponse(UUID id, String name, String description, String city,
		Map<ContactType, String> contacts, OrganizationStatus status, String rejectReason,
		Instant submittedAt, Instant reviewedAt, Instant createdAt, Instant updatedAt,
		String logoUrl, List<FileResponse> documents,
		/** Виды спорта организации. */
		List<SportResponse> sports) {
}
