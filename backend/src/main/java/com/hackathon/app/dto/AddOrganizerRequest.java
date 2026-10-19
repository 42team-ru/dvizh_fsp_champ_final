package com.hackathon.app.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Добавить соорганизатора")
public record AddOrganizerRequest(
		@Schema(description = "Логин или email пользователя", example = "maria", requiredMode = REQUIRED)
		@NotBlank @Size(max = 255) String login) {
}
