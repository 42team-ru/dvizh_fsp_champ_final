package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.hackathon.app.domain.enums.RegistrationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Занятие в архиве или ближайших встречах клуба; приватных полей нет. */
public record OrganizationMeetingResponse(
        @Schema(requiredMode = REQUIRED) UUID id,
        @Schema(requiredMode = REQUIRED) UUID eventId,
        @Schema(requiredMode = REQUIRED) String title,
        @Schema(requiredMode = REQUIRED) SportResponse sport,
        @Schema(requiredMode = REQUIRED) Instant startAt,
        @Schema(requiredMode = REQUIRED) String timeZone,
        @Schema(requiredMode = REQUIRED) String place,
        Integer capacity,
        @Schema(requiredMode = REQUIRED) long attendeesCount,
        @Schema(requiredMode = REQUIRED) List<UserShortResponse> attendees,
        RegistrationStatus myRegistrationStatus,
        String coverUrl,
        FocusPoint coverFocus,
        @Schema(requiredMode = REQUIRED) long photosCount) {}
