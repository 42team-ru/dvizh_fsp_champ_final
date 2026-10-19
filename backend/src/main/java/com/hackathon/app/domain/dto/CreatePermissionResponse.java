package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Может ли текущий аккаунт создавать мероприятия: фронт рисует кнопку «Создать» по этому ответу")
public record CreatePermissionResponse(
		@Schema(description = "Можно создавать", requiredMode = REQUIRED) boolean canCreate,
		@Schema(description = "Почему нельзя, текст для человека; null — можно",
				example = "Публиковать мероприятия от организации можно только после одобрения заявки")
		String reason) {
}
