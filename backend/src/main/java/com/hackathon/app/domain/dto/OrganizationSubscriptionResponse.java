package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Актуальное состояние подписки и публичный счётчик. */
public record OrganizationSubscriptionResponse(
        @Schema(requiredMode = REQUIRED) boolean subscribed,
        @Schema(requiredMode = REQUIRED) long subscribersCount,
        @Schema(requiredMode = REQUIRED) List<UserShortResponse> subscriberAvatars) {}
