package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Предложение «Организации месяца» за месяц и лучшие кандидаты")
public record AdminAwardsResponse(
		@Schema(description = "Первый день месяца", example = "2026-09-01", requiredMode = REQUIRED) LocalDate period,
		@Schema(description = "Награда за месяц (предложенная или подтверждённая); null — ещё нет") OrganizationAwardResponse award,
		@Schema(description = "Лучшие кандидаты по убыванию счёта, до 5", requiredMode = REQUIRED) List<AwardCandidateResponse> candidates) {
}
