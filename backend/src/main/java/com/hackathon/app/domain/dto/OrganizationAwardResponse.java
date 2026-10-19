package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.hackathon.app.domain.enums.AwardStatus;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Награда «Организация месяца»")
public record OrganizationAwardResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Организация-победитель", requiredMode = REQUIRED) UUID organizationId,
		@Schema(description = "Название организации", requiredMode = REQUIRED) String organizationName,
		@Schema(description = "Первый день месяца, за который награда", example = "2026-09-01", requiredMode = REQUIRED) LocalDate period,
		@Schema(description = "Счёт", example = "45", requiredMode = REQUIRED) int score,
		@Schema(description = "Предложена или подтверждена", requiredMode = REQUIRED) AwardStatus status,
		@Schema(description = "Когда подтверждена; null — ещё нет") Instant confirmedAt) {
}
