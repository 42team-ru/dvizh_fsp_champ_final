package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Кандидат на «Организацию месяца» со счётом")
public record AwardCandidateResponse(
		@Schema(requiredMode = REQUIRED) UUID organizationId,
		@Schema(requiredMode = REQUIRED) String organizationName,
		@Schema(description = "Встреч за месяц", requiredMode = REQUIRED) int meetings,
		@Schema(description = "Уникальных пришедших участников", requiredMode = REQUIRED) int participants,
		@Schema(description = "Из них вернувшихся (были у организации и раньше)", requiredMode = REQUIRED) int returning,
		@Schema(description = "Событий, снятых или удалённых админом за месяц", requiredMode = REQUIRED) int moderated,
		@Schema(description = "Счёт: пришедшие ×3 + вернувшиеся ×5 − 30 за снятое событие", requiredMode = REQUIRED) int score) {
}
