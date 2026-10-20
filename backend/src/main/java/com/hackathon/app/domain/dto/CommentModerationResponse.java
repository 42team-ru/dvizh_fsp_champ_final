package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.Set;
import java.util.UUID;

import com.hackathon.app.domain.enums.ModerationCategory;
import com.hackathon.app.domain.enums.ModerationStatus;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Оценка сообщения модерацией — только администратору")
public record CommentModerationResponse(
		@Schema(description = "Id проверки в очереди", requiredMode = REQUIRED) UUID checkId,
		@Schema(requiredMode = REQUIRED) ModerationStatus status,
		@Schema(requiredMode = REQUIRED) Set<ModerationCategory> categories,
		@Schema(requiredMode = REQUIRED) int severity,
		@Schema(description = "Пояснение оценки") String explanation) {
}
