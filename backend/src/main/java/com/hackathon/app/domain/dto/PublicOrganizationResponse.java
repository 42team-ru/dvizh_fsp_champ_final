package com.hackathon.app.domain.dto;

import com.hackathon.app.domain.enums.ContactType;

import java.util.List;
import java.util.Map;
import java.util.UUID;


/** Публичная страница одобренной организации. */
public record PublicOrganizationResponse(UUID id, String name, String description, String city,
		Map<ContactType, String> contacts, String logoUrl, List<FileResponse> documents,
		/** Подтверждённые награды «Организация месяца», свежие первыми. */
		List<AwardBadgeResponse> awards,
		/** Виды спорта организации. */
		List<SportResponse> sports,
		/** Доверие: сколько встреч уже провела (прошедшие неотменённые занятия). */
		long hostedMeetings,
		/** Доверие: сколько разных людей подтверждённо записывались на её прошедшие встречи. */
		long participantsTotal) {
}
