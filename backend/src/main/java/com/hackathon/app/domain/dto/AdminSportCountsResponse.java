package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Счётчики вкладок админки «Виды спорта»")
public record AdminSportCountsResponse(
		@Schema(description = "Всего видов", requiredMode = REQUIRED) long all,
		@Schema(description = "Активные: справочник и одобренные", requiredMode = REQUIRED) long catalog,
		@Schema(description = "Ждут проверки админа", requiredMode = REQUIRED) long pending,
		@Schema(description = "Скрытые и объединённые", requiredMode = REQUIRED) long hidden,
		@Schema(description = "Без своей картинки", requiredMode = REQUIRED) long withoutImage) {
}
