package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Организация в карточке мероприятия: ссылка на её публичную страницу")
public record OrganizationShortResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Название", example = "Шахматный клуб «Ладья»", requiredMode = REQUIRED) String name) {
}
