package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Карточка публичного каталога. */
public record OrganizationCardResponse(
        @Schema(requiredMode = REQUIRED) UUID id,
        @Schema(requiredMode = REQUIRED) String name,
        String description,
        String city,
        String logoUrl,
        @Schema(requiredMode = REQUIRED) List<SportResponse> sports,
        @Schema(requiredMode = REQUIRED) long hostedMeetings,
        @Schema(requiredMode = REQUIRED) long subscribersCount,
        @Schema(requiredMode = REQUIRED) boolean subscribed,
        @Schema(requiredMode = REQUIRED) boolean attended,
        LocalDate awardMonth) {}
