package com.hackathon.app.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** Публичная карточка человека (организатор, участник): без email и прочих личных данных. */
@Schema(description = "Публичная карточка человека: организатор или участник, без email")
public record UserShortResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Логин", example = "ivan", requiredMode = REQUIRED) String username,
		@Schema(description = "Имя", example = "Иван", requiredMode = REQUIRED) String firstName,
		@Schema(description = "Фамилия", example = "Петров", requiredMode = REQUIRED) String lastName) {
}
